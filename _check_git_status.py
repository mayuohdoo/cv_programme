#!/usr/bin/env python3
"""Script to check git status by parsing git data directly."""
import zlib
import os
import struct
import sys

REPO = r"C:\Users\Lenovo\Desktop\coding girls\cv_programme"

def read_git_object(sha):
    """Read and decompress a git object."""
    path = os.path.join(REPO, ".git", "objects", sha[:2], sha[2:])
    try:
        with open(path, "rb") as f:
            compressed = f.read()
        data = zlib.decompress(compressed)
        # Split into header and content
        null_idx = data.index(b'\x00')
        header = data[:null_idx].decode()
        content = data[null_idx+1:]
        return header, content
    except Exception as e:
        print(f"Error reading {sha}: {e}", file=sys.stderr)
        return None, None

def parse_tree(content):
    """Parse a git tree object and return list of (mode, name, sha) tuples."""
    entries = []
    pos = 0
    while pos < len(content):
        # mode name\0 sha (20 bytes)
        space_idx = content.index(b' ', pos)
        mode = content[pos:space_idx].decode()
        null_idx = content.index(b'\x00', space_idx)
        name = content[space_idx+1:null_idx].decode()
        sha = content[null_idx+1:null_idx+21].hex()
        entries.append((mode, name, sha))
        pos = null_idx + 21
    return entries

def get_commit_tree(commit_sha):
    """Get the tree SHA from a commit object."""
    header, content = read_git_object(commit_sha)
    if header is None:
        return None
    # Commit format: "tree <sha>\nparent ..."
    first_line = content.split(b'\n')[0]
    tree_sha = first_line.split(b' ')[1].decode()
    return tree_sha

def get_tree_files(tree_sha, prefix=""):
    """Recursively get all files from a tree."""
    files = {}
    header, content = read_git_object(tree_sha)
    if header is None:
        return files

    entries = parse_tree(content)
    for mode, name, sha in entries:
        path = os.path.join(prefix, name).replace("\\", "/")
        if mode.startswith("04"):  # tree
            files.update(get_tree_files(sha, path))
        else:
            files[path] = sha
    return files

def parse_index():
    """Parse the git index file to get tracked files and their metadata."""
    index_path = os.path.join(REPO, ".git", "index")
    tracked = {}

    with open(index_path, "rb") as f:
        data = f.read()

    # DIRC header
    signature = data[:4]
    version = struct.unpack(">I", data[4:8])[0]
    num_entries = struct.unpack(">I", data[8:12])[0]

    print(f"Index: {signature.decode()} v{version}, {num_entries} entries", file=sys.stderr)

    pos = 12
    for _ in range(num_entries):
        # Each entry is at least 62 bytes + path name + padding
        # ctime: 8 bytes, mtime: 8 bytes, dev: 4, ino: 4, mode: 4, uid: 4, gid: 4, size: 4
        # sha: 20 bytes, flags: 2
        ctime_sec = struct.unpack(">I", data[pos:pos+4])[0]
        ctime_ns = struct.unpack(">I", data[pos+4:pos+8])[0]
        mtime_sec = struct.unpack(">I", data[pos+8:pos+12])[0]
        mtime_ns = struct.unpack(">I", data[pos+12:pos+16])[0]
        dev = struct.unpack(">I", data[pos+16:pos+20])[0]
        ino = struct.unpack(">I", data[pos+20:pos+24])[0]
        mode = struct.unpack(">I", data[pos+24:pos+28])[0]
        uid = struct.unpack(">I", data[pos+28:pos+32])[0]
        gid = struct.unpack(">I", data[pos+32:pos+36])[0]
        size = struct.unpack(">I", data[pos+36:pos+40])[0]
        sha = data[pos+40:pos+60].hex()
        flags = struct.unpack(">H", data[pos+60:pos+62])[0]

        # Name length from flags (1-bit assume-valid, 1-bit extended, 1-bit stage, 13-bit name len)
        name_len = flags & 0xFFF

        # Name starts at position 62
        name_end = pos + 62
        name_data = data[name_end:name_end + name_len]
        name = name_data.decode('utf-8', errors='replace').rstrip('\x00')

        tracked[name] = {
            'sha': sha,
            'mtime_sec': mtime_sec,
            'size': size,
        }

        # Move to next entry (aligned to 8 bytes)
        entry_size = 62 + name_len
        padding = (8 - entry_size % 8) % 8
        pos += entry_size + padding

    return tracked

def main():
    print("=" * 60)
    print("GIT STATUS ANALYSIS for cv_programme")
    print("=" * 60)

    # Current branch
    with open(os.path.join(REPO, ".git", "HEAD")) as f:
        head_content = f.read().strip()
    print(f"\nHEAD: {head_content}")

    # Read current branch commit
    if head_content.startswith("ref: "):
        ref_path = os.path.join(REPO, ".git", head_content[5:])
        with open(ref_path) as f:
            current_commit = f.read().strip()
    else:
        current_commit = head_content

    print(f"Current commit: {current_commit}")

    # Read main branch commit
    main_path = os.path.join(REPO, ".git", "refs", "heads", "main")
    with open(main_path) as f:
        main_commit = f.read().strip()
    print(f"Main commit:     {main_commit}")

    # Get tracked files from index
    print("\n--- Files tracked in index ---")
    tracked = parse_index()

    frontend_exts = {'.html', '.js', '.css'}
    frontend_files = {}
    other_files = {}

    for name, info in tracked.items():
        ext = os.path.splitext(name)[1].lower()
        if ext in frontend_exts:
            frontend_files[name] = info
        else:
            other_files[name] = info

    print(f"\nTotal tracked files: {len(tracked)}")
    print(f"Frontend files (.html/.js/.css): {len(frontend_files)}")
    print(f"Other files: {len(other_files)}")

    print("\n--- ALL TRACKED FRONTEND FILES ---")
    for name in sorted(frontend_files.keys()):
        print(f"  {name}")

    # Compare current branch vs main
    print("\n--- Comparing current branch vs main ---")
    current_tree = get_commit_tree(current_commit)
    main_tree = get_commit_tree(main_commit)

    if current_tree and main_tree:
        current_files = get_tree_files(current_tree)
        main_files = get_tree_files(main_tree)

        # Files different between branches
        all_paths = set(current_files.keys()) | set(main_files.keys())

        added = []
        removed = []
        modified = []

        for path in sorted(all_paths):
            in_current = path in current_files
            in_main = path in main_files
            if in_current and not in_main:
                added.append(path)
            elif not in_current and in_main:
                removed.append(path)
            elif current_files[path] != main_files[path]:
                modified.append(path)

        print(f"Added: {len(added)} files")
        print(f"Removed: {len(removed)} files")
        print(f"Modified: {len(modified)} files")

        for f in added:
            print(f"  + {f}")
        for f in removed:
            print(f"  - {f}")
        for f in modified:
            print(f"  ~ {f}")

    # Check working tree vs index
    print("\n--- Working tree changes (modified but not staged) ---")
    for name, info in sorted(frontend_files.items()):
        full_path = os.path.join(REPO, name)
        if os.path.exists(full_path):
            stat = os.stat(full_path)
            actual_size = stat.st_size
            actual_mtime = int(stat.st_mtime)

            if actual_size != info['size'] or actual_mtime != info['mtime_sec']:
                print(f"  MODIFIED: {name} (index size={info['size']}, actual size={actual_size})")

    # Check for untracked frontend files
    print("\n--- Untracked frontend files ---")
    for root, dirs, files in os.walk(REPO):
        if '.git' in dirs:
            dirs.remove('.git')
        for f in files:
            if f.endswith('.html') or f.endswith('.js') or f.endswith('.css'):
                rel_path = os.path.relpath(os.path.join(root, f), REPO)
                if rel_path not in tracked and rel_path not in current_files:
                    print(f"  UNTRACKED: {rel_path}")

if __name__ == "__main__":
    main()
