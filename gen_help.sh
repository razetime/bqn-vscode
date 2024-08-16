#!/bin/bash

set -eufo pipefail

default_out=src/help.json

usage() {
    cat <<EOS
Usage: $(basename "$0") [-c] BQN_REPO_DIR [OUT_FILE]

Generates $default_out from Markdown files in the BQN repo.
Also checks that all URLs give 200 when -c is provided.
Used to produce help messages on hover in the VS Code extension.
EOS
}

check_urls=false
case ${1-} in
    -h|--help|help) usage; exit ;;
    -c) check_urls=true; shift ;;
esac

if [[ $# -eq 0 ]]; then
    usage >&2
    exit 1
fi

bqn_repo=$1
out_file=${2-$default_out}
# Useful when adding debug prints in the Lua file.
[[ "$out_file" == - ]] && out_file=/dev/stdout

if ! command -v pandoc &>/dev/null; then
    echo >&2 "error: pandoc must be installed"
    exit 1
fi

url_file=$(mktemp)
trap 'rm -f "$url_file"' EXIT

find "$bqn_repo/help" -maxdepth 1 -name "*.md" -not -name "README.md" \
    | sort \
    | xargs pandoc -M bqn_repo="$bqn_repo" -M url_file="$url_file" \
        -f commonmark -t gen_help_writer.lua \
    | npx prettier  --parser json --no-config --tab-width 4 \
    > "$out_file"

if [[ $check_urls == true ]]; then
    echo >&2 "checking urls"
    n=0
    while read -r url; do
        {
            if ! curl --head --silent --show-error --fail "$url" >/dev/null; then
                echo >&2 "$url: not found"
                exit 1
            fi
            echo -n >&2 .
        } &
        ((n++))
        if [[ n -eq 10 ]]; then
            wait
        fi
    done < "$url_file"
    wait
    echo >&2
fi
