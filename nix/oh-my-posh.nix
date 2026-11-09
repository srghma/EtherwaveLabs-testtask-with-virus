{
  runCommand,
  oh-my-posh,
  theme ? "di4am0nd",
}:
runCommand "oh-my-posh-autoload" { } ''
  mkdir -p $out/share/nushell/vendor/autoload
  HOME=$TMPDIR ${oh-my-posh}/bin/oh-my-posh init nu \
    --config ${oh-my-posh}/share/oh-my-posh/themes/${theme}.omp.json \
    --print > $out/share/nushell/vendor/autoload/00-oh-my-posh.nu

  # Prevent crash when history.txt does not exist yet on first prompt
  substituteInPlace $out/share/nushell/vendor/autoload/00-oh-my-posh.nu \
    --replace-fail \
      'let hist = if $nu.history-enabled { history } else { [] }' \
      'let hist = if $nu.history-enabled { try { history } catch { [] } } else { [] }'
''
