{
  runCommand,
  nushell-config,
}:
runCommand "nushell-settings-autoload" { } ''
  mkdir -p $out/share/nushell/vendor/autoload
  ln -s ${nushell-config} $out/share/nushell/vendor/autoload/01-config.nu
''
