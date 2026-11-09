#!/usr/bin/env nu

def main [] {
    let lock_path = ($env.HOME | path join ".dotfiles" "flake.lock")

    if not ($lock_path | path exists) {
        print $"Error: ($lock_path) does not exist."
        return 1
    }

    let rev = (open $lock_path | from json | get nodes.nixpkgs.locked.rev)
    print $"Found nixpkgs revision in dotfiles: ($rev)"

    let flake_content = $"\{
  description = \"Web3 Sandbox\";

  inputs = \{
    nixpkgs.url = \"github:NixOS/nixpkgs/($rev)\";
  \};

  outputs = \{ self, nixpkgs \}: \{
    pkgs.x86_64-linux = import nixpkgs \{
      system = \"x86_64-linux\";
      config.allowUnfree = true;
    \};
  \};
\}
"

    $flake_content | save -f flake.nix
    print "Successfully updated flake.nix!"
}
