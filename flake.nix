{
  description = "Web3 Sandbox";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/b1b875982b17dabde9b4a37f3e229e74913e6db3";
    arion.url = "github:hercules-ci/arion";
    arion.inputs.nixpkgs.follows = "nixpkgs";
    nushell-config = {
      url = "path:/home/srghma/.dotfiles/nushell/config.nu";
      flake = false;
    };
  };

  outputs =
    {
      # self,
      nixpkgs,
      arion,
      nushell-config,
      ...
    }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs {
        inherit system;
        config.allowUnfree = true;
        overlays = [
          (_final: _prev: {
            inherit nushell-config;
          })
        ];
      };
    in
    {
      inherit pkgs;

      # Evaluates arion-compose.nix using the flake's pkgs directly
      packages.${system}.composeYaml = (
        arion.lib.build {
          inherit pkgs;
          modules = [ ./arion-compose.nix ];
        }
      );
    };
}
