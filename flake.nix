{
  description = "Web3 Sandbox";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/b1b875982b17dabde9b4a37f3e229e74913e6db3";
    nushell-config = {
      url = "path:/home/srghma/.dotfiles/nushell/config.nu";
      flake = false;
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      nushell-config,
    }:
    {
      pkgs = import nixpkgs {
        system = "x86_64-linux";
        config.allowUnfree = true;
        overlays = [
          (final: prev: {
            inherit nushell-config;
          })
        ];
      };
    };
}
