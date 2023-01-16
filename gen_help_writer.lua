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
    wrap_text = "wrap-none"
  }))
end

-- Builds a table mapping BQN glyphs to the character used to type them after a
-- backslash, reading from a file where each line contains those two characters.
local function build_keymap(filename)
  local map = {}
  for line in io.lines(filename) do
    -- Note that we can't use indices 1 and 2 because the Unicode characters in
    -- the first column are more than one byte long.
    map[line:sub(1, -2)] = line:sub(-1)
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

function Writer(doc, options)
  local keymap = build_keymap(assert(doc.meta.keymap_file))
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

  -- Prevent pandoc from trying to print the returned doc.
  os.exit(0)
end
