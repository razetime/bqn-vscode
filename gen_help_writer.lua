-- Removes leading and trailing spaces from a string.
local function trim(s)
  return s:match "^%s*(.-)%s*$"
end

-- Returns `s` as a double-quoted JSON string.
local function json_str(s)
  return '"' .. s:gsub("[\\\"]", "\\%0"):gsub("\n", "\\n") .. '"'
end

-- Renders a list of Pandoc elements to CommonMark.
local function render(els)
  return trim(pandoc.write(pandoc.Pandoc(els), "commonmark", {
    wrap_text = "wrap-none",
  }))
end

-- Reads the snippets file and builds a table mapping BQN glyphs to the
-- character used to type them after a backslash, e.g. "↕" maps to "d".
local function load_keymap()
  local f = assert(io.open("snippets/snippets.code-snippets"))
  local snippets = pandoc.json.decode(assert(f:read("*a")), false)
  f:close()
  local map = {}
  for name, properties in pairs(snippets) do
    local glyph = properties.body[1]
    local chars = properties.prefix[1]
    if chars:find("^\\") then
      map[glyph] = chars:sub(2)
    end
  end
  return map
end

-- Converts a relative link to an absolute one, if it isn't already.
local function absolute_link(url)
  if url:match "^https://" then return url end
  local path, frag
  path, frag = url:match "^%.%./([^.]*)%.md(.*)$"
  if path then
    return "https://mlochbaum.github.io/BQN/" .. path .. ".html" .. frag
  end
  path, frag = url:match "^([^.]*)%.md(.*)$"
  if path then
    return "https://mlochbaum.github.io/BQN/help/" .. path .. ".html" .. frag
  end
  assert(false, "cannot convert url: " .. url)
end

-- Converts relative links to absolute in a Doc, and write links to url_file.
local function expand_relative_links(el, url_file)
  local written_urls = {}
  local f = assert(io.open(url_file, "w"))
  el = el:walk {
    Link = function(el)
      el.target = absolute_link(el.target)
      local url = el.target:gsub("#.*$", "")
      if not written_urls[url] then
        written_urls[url] = true
        f:write(el.target .. "\n")
      end
      return el
    end
  }
  f:close()
  return el
end

-- Parses the link from an element, or nil if there is none.
local function parse_link(el)
  local href
  el:walk {Link = function(el) href = el.target end}
  return href
end

-- Parses the "View this file with results and syntax highlighting here" link
-- that appears at the top of each file before the h1.
local function parse_help_page_link(el)
  local href = assert(parse_link(el))
  assert(pandoc.utils.stringify(el) == "View this file with results and syntax highlighting here.")
  return assert(href:match "^https://mlochbaum%.github%.io/BQN/help/.-%.html$", href)
end

-- Parses the "→full documentation" link that appears after most h2 elements,
-- or nil if there is none.
local function parse_full_documentation_link(el)
  local href = parse_link(el)
  if not href then return nil end
  local str = pandoc.utils.stringify(el)
  assert(str == "→full documentation" or str == "→specification", str)
  return href
end

-- Parses an h1 header, returning a list of {glyph, inlines} tables. The only
-- time it returns more than one is for Comma and Diamond as they share a page.
local function parse_h1(h1)
  local title = {}
  for i = 1, #h1.content do
    local el = h1.content[i]
    if el.t == "Str" and el.text == "(" then
      if i ~= #h1.content - 2 then
        local str = pandoc.utils.stringify(h1)
        assert(str == "Comma (,) and Diamond (⋄)", str)
        return {
          {glyph = ",", title = {pandoc.Str "Comma"}},
          {glyph = "⋄", title = {pandoc.Str "Diamond"}},
        }
      end
      local el1 = h1.content[i+1]
      local el2 = h1.content[i+2]
      assert(el1.t == "Code", el1.t)
      assert(el2.t == "Str", el2.t)
      assert(el2.text == ")", el2.text)
      local glyph = el1.text
      assert(#title > 0, #title)
      assert(title[#title].t == "Space", title[#title].t)
      table.remove(title)
      return {{glyph = glyph, title = title}}
    end
    table.insert(title, el)
  end
  assert(false, "no '(' found in h1")
end

-- Parses an h2 header, returning  to_colon and after_colon (lists of inlines).
local function parse_h2(h2)
  for i = 1, #h2.content do
    if h2.content[i].t == "Str" and h2.content[i].text == ":" then
      assert(i < #h2.content, i)
      assert(h2.content[i+1].t == "Space", h2.content[i+1].t)
      return {table.unpack(h2.content, 1, i+1)}, {table.unpack(h2.content, i+2)}
    end
  end
end

-- Returns true if `el` is a header with the given level.
local function is_header(el, level)
  return el.t == "Header" and el.level == level
end

-- Given doc which is all BQN/help/*.md files concatenated together, writes a
-- JSON object mapping each BQN glyph to a list of Markdown strings to display
-- in a VS Code hover.
local function write_glyph_help(doc)
  local keymap = load_keymap()
  doc = expand_relative_links(doc, assert(doc.meta.url_file))

  local first = true
  local headers, help_page_link, sections
  local function flush()
    if not headers then return end
    for _, header in ipairs(headers) do
      if not first then print "," end
      first = false
      print(json_str(header.glyph) .. ": [")
      local items = {
        pandoc.Link(header.title, help_page_link),
        pandoc.Space(),
        pandoc.Str '(',
        pandoc.Code(header.glyph),
      }
      local keymap_char = keymap[header.glyph]
      if keymap_char then
        table.insert(items, pandoc.Str ',')
        table.insert(items, pandoc.Space())
        table.insert(items, pandoc.Emph{pandoc. Str 'keymap:'})
        table.insert(items, pandoc.Space())
        table.insert(items, pandoc.Code("\\" .. keymap_char))
      end
      table.insert(items, pandoc.Str ')')
      print(json_str(render(pandoc.Para(items))))
      for i, section in ipairs(sections) do
        print("," .. json_str(render(section)))
      end
      print "]"
    end
    headers = nil
    help_page_link = nil
    sections = nil
  end

  print "{"
  local next_help_page_link, full_documentation_link
  local i = 1
  while i < #doc.blocks do
    local el = doc.blocks[i]
    if is_header(el, 1) then
      flush()
      headers = parse_h1(el)
      help_page_link = assert(next_help_page_link)
      next_help_page_link = nil
      assert(i < #doc.blocks, i)
      if doc.blocks[i+1].t == "Para" then
        -- The only time the "→full documentation" appears after the h1 instead
        -- of after the h2 is in beginexpression.md which documents `(`.
        assert(#headers == 1, #headers)
        assert(headers[1].glyph == "(", headers[1].glyph)
        full_documentation_link = assert(parse_full_documentation_link(doc.blocks[i+1]))
        i = i + 1
      end
      sections = {}
    elseif is_header(el, 2) then
      local inlines = el.content
      if not full_documentation_link then
        full_documentation_link = parse_full_documentation_link(doc.blocks[i+1])
      end
      if full_documentation_link then
        i = i + 1
        local after_colon
        inlines, after_colon = parse_h2(el)
        table.insert(inlines,
          pandoc.Link(pandoc.Strong(after_colon), full_documentation_link))
        full_documentation_link = nil
      else
        inlines = {pandoc.Strong(inlines)}
      end
      table.insert(sections, {pandoc.Para(inlines)})
    elseif is_header(el, 3) then
      -- Only nothing.md contains level 3 headers.
      assert(#headers == 1, #headers)
      assert(headers[1].glyph == "·", headers[1].glyph)
      assert(i < #doc.blocks, i)
      href = assert(parse_full_documentation_link(doc.blocks[i+1]))
      i = i + 1
      table.insert(sections, {pandoc.Para{pandoc.Link(el.content, href)}})
    elseif el.t == "Para" then
      if el.t == "Para" and i < #doc.blocks and is_header(doc.blocks[i+1], 1) then
        next_help_page_link = assert(parse_help_page_link(el))
      else
        assert(sections)
        assert(#sections > 0, #sections)
        table.insert(sections[#sections], el)
      end
    elseif el.t == "BulletList" then
      assert(sections)
      assert(#sections > 0, #sections)
      -- Example code blocks start with 8 spaces (4 spaces for the code block, 4
      -- for the BQN prompt). This extra indendation makes Pandoc think its part
      -- of the previous list item, so we strip them out here.
      el = el:walk {CodeBlock = function(el) return {} end}
      table.insert(sections[#sections], el)
    elseif el.t == "CodeBlock" then
      -- Don't include examples since they would make the hover docs too long
      -- and we'd need to run bqn to include their results.
    else
      assert(false, "unhandled case: " .. el.t)
    end
    i = i + 1
  end
  flush()
  print "}"
end

local headers_to_system_namespaces = {
  ["Files"] = "file",
  ["Terminal I/O"] = "term",
  ["Platform"] = "platform",
  ["Namespaces"] = "ns",
}

local headers_to_manual_system_entries = {
  ["Data structures"] = {
    {"HashMap", "Create a mutable object from the list of initial keys `𝕨` and values `𝕩` that maintains an association mapping keys to values"}
  },
  ["Random generation"] = {
    {"MakeRand", "Initializes a deterministic pseudorandom number generator with seed value `𝕩` (**not** cryptographically secure)"},
    {"rand", "A globally accessible generator initialized at first use (**not** cryptographically secure)"},
  },
  ["Bitwise operations"] = {
    {"bit._not", "Compute the bitwise NOT of an array `𝕩` of `𝕗`-bit values"},
    {"bit._and", "Compute the bitwise AND of arrays `w` and `𝕩` of `w`-bit values operating on `u`-bit units, where `u‿w ← 𝕗`"},
    {"bit._or", "Compute the bitwise OR of arrays `w` and `𝕩` of `w`-bit values operating on `u`-bit units, where `u‿w ← 𝕗`"},
    {"bit._xor", "Compute the bitwise XOR of arrays `w` and `𝕩` of `w`-bit values operating on `u`-bit units, where `u‿w ← 𝕗`"},
    {"bit._neg", "Compute the two's complement negation of an array `𝕩` of `𝕗`-bit values"},
    {"bit._add", "Compute the two's complement addition of arrays `w` and `𝕩` of `w`-bit values operating on `u`-bit units, where `u‿w ← 𝕗`"},
    {"bit._sub", "Compute the two's complement subtraction of arrays `w` and `𝕩` of `w`-bit values operating on `u`-bit units, where `u‿w ← 𝕗`"},
    {"bit._mul", "Compute the two's complement multiplication of arrays `w` and `𝕩` of `w`-bit values operating on `u`-bit units, where `u‿w ← 𝕗`"},
    {"bit._cast", "Convert values in `𝕩` from type `a` to type `b`, where `a‿b ← 𝕗`, and types are represented by a number (bit width) or number-character pair (bit width and 'u' for unsigned, 'i' for signed, 'c' for character, 'f' for float)"},
  },
  ["Math"] = {
    {"math.Cbrt", "Compute the cube root of `𝕩`"},
    {"math.Log2", "Compute the base-2 logarithm of `𝕩`"},
    {"math.Log10", "Compute the base-10 logarithm of `𝕩`"},
    {"math.Log1p", "Compute the natural logarithm of `𝕩`"},
    {"math.Expm1", "Compute _e_ (Euler's number) raised to the power `𝕩`, minus 1"},
    {"math.Hypot", "Compute the square root of the sum of the squares of `w` and `𝕩`"},
    {"math.Sin", "Compute the sine of `𝕩` in radians"},
    {"math.Cos", "Compute the cosine of `𝕩` in radians"},
    {"math.Tan", "Compute the tangent of `𝕩` in radians"},
    {"math.Sinh", "Compute the hyperbolic sine of `𝕩` in radians"},
    {"math.Cosh", "Compute the hyperbolic cosine of `𝕩` in radians"},
    {"math.Tanh", "Compute the hyperbolic tangent of `𝕩` in radians"},
    {"math.ASin", "Compute the inverse sine of `𝕩` in radians"},
    {"math.ACos", "Compute the inverse cosine of `𝕩` in radians"},
    {"math.ATan", "Compute the inverse tangent of `𝕩` in radians"},
    {"math.ASinh", "Compute the inverse hyperbolic sine of `𝕩` in radians"},
    {"math.ACosh", "Compute the inverse hyperbolic cosine of `𝕩` in radians"},
    {"math.ATanh", "Compute the inverse hyperbolic tangent of `𝕩` in radians"},
    {"math.ATan2", "Compute the angle of of vector `𝕨‿𝕩` relative to `1‿0` in radians"},
    {"math.Fact", "Compute the factorial (or gamma function) of `𝕩`"},
    {"math.LogFact", "Compute the natural logarithm of the factorial (or gamma function) of `𝕩`"},
    {"math.Comb", "Compute the binomial function \"`𝕨` choose `𝕩`\""},
    {"math.Erf", "Compute the error function of `𝕩`"},
    {"math.ErfC", "Compute the complementary error function of `𝕩`"},
    {"math.GCD", "Compute the greatest common divisor of `w` and `𝕩`"},
    {"math.LCM", "Compute the least common multiple of `w` and `𝕩`"},
  }
}

-- Reads BQN/spec/system.md and writes a JSON object mapping each system
-- function name to its description.
local function write_system_help(bqn_repo)
  local f = assert(io.open(bqn_repo .. "/spec/system.md"))
  local doc = pandoc.read(assert(f:read("*a")), "commonmark+pipe_tables+gfm_auto_identifiers")
  f:close()

  local comma = ""
  local nearest_header_id
  local emit = function(name, description)
    local url = "https://mlochbaum.github.io/BQN/spec/system.html#" .. nearest_header_id
    local title = pandoc.Para {
      pandoc.Link(pandoc.Code("•" .. name), url),
      pandoc.Space(),
      pandoc.Str "(system value)",
    }
    print(comma .. json_str(name) .. ": ["
      .. json_str(render(title)) .. ", "
      .. json_str(description) .. "]"
    )
    comma = ","
  end

  local namespace
  local namespace_level = 1

  print "{"
  doc:walk {
    Header = function(el)
      nearest_header_id = el.identifier
      local text = pandoc.utils.stringify(el.content)
      local ns = headers_to_system_namespaces[text]
      if ns then
        namespace = ns
        namespace_level = el.level
        return
      end
      local entries = headers_to_manual_system_entries[text]
      if entries then
        for _, entry in ipairs(entries) do
          emit(entry[1], entry[2])
        end
      end
      if el.level <= namespace_level then
        namespace = nil
      end
    end,
    Table = function(el)
      for _, body in ipairs(el.bodies) do
        for _, row in ipairs(body.body) do
          if #row.cells == 2 then
            inlines = pandoc.utils.blocks_to_inlines(row.cells[1].contents)
            if #inlines == 1 and inlines[1].t == "Code" then
              local text = inlines[1].text
              local description = render(row.cells[2].content)
              local match = text:match("^•(.+)")
              if match then
                emit(match, description)
              elseif namespace then
                emit(namespace .. "." .. text, description)
              end
            end
          end
        end
      end
    end,
  }
  print "}"
end

function Writer(doc, options)
  print "{"
  print "\"glyphs\":"
  write_glyph_help(doc)
  print ","
  print "\"system\":"
  write_system_help(assert(doc.meta.bqn_repo))
  print "}"
  -- Prevent pandoc from trying to print the returned doc.
  os.exit(0)
end
