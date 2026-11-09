let
  hasNixpkgs = builtins.tryEval <nixpkgs>;
in
if hasNixpkgs.success then
  import <nixpkgs> { }
else
  (import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/nixpkgs-unstable.tar.gz") { })
