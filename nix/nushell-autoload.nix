{
  symlinkJoin,
  callPackage,
}:
let
  ohMyPoshAutoload = callPackage ./oh-my-posh.nix { };
  nushellSettingsAutoload = callPackage ./nushell-settings.nix { };
in
symlinkJoin {
  name = "nushell-vendor-autoload";
  paths = [
    ohMyPoshAutoload
    nushellSettingsAutoload
  ];
}
