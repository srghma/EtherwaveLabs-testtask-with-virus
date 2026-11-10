{
  # config,
  # options,
  pkgs,
  ...
}:
let
  userName = "x";
  uid = 1001;

  nushellAutoload = pkgs.callPackage ./nix/nushell-autoload.nix { };

  sandboxPkgs = with pkgs; [
    coreutils
    bashInteractive
    cacert
    git
    which
    curl
    jq

    # Rust-based JS/TS tooling (replaces Prettier & ESLint)
    biome
    oxlint

    # Shell & aesthetics
    nushell
    oh-my-posh
    nushellAutoload

    # Runtimes & Web3
    nodejs_22
    bun
    foundry
    postgresql # Provides psql inside the sandbox for manual DB queries
  ];
in
{
  project.name = "web3-sandbox";

  docker-compose.volumes = {
    postgres-data = { };
  };

  # ---------------------------------------------------------------------------
  # 1. PostgreSQL Database Service
  # ---------------------------------------------------------------------------
  services.postgres = {
    service = {
      image = "postgres:19rc1-alpine";
      restart = "unless-stopped";

      # Standard Drizzle local credentials
      environment = {
        POSTGRES_USER = "postgres";
        POSTGRES_PASSWORD = "password";
        POSTGRES_DB = "local";
      };

      # Expose to host so you can inspect DB via host GUI (DBeaver, TablePlus, etc.)
      ports = [
        "5432:5432"
      ];

      # Persist DB data inside local .cache folder (isolated)
      volumes = [
        "./.cache/postgres:/var/lib/postgresql/"
      ];
    };
  };

  # ---------------------------------------------------------------------------
  # 2. Main Development Sandbox
  # ---------------------------------------------------------------------------
  services.sandbox = {
    nixos.useSystemd = false;
    image.enableRecommendedContents = true;

    nixos.configuration = {
      users.users.${userName} = {
        isNormalUser = true;
        uid = uid;
        group = userName;
        home = "/home/${userName}";
        shell = pkgs.nushell;
      };
      users.groups.${userName}.gid = uid;

      environment.systemPackages = sandboxPkgs;
    };

    service = {
      useHostStore = true;
      user = "${toString uid}:${toString uid}";
      working_dir = "/workspace";

      defaultExec = [ "nu" ];

      # # Starts the SvelteKit dev server automatically on container boot
      command = [
        "bun"
        "run"
        "dev"
        "--"
        "--host"
        "0.0.0.0"
        "--port"
        "3000"
      ];

      depends_on = [
        "postgres"
      ];

      tmpfs = [
        "/tmp"
      ];

      ports = [
        "3000:3000"
      ];

      volumes = [
        "./workspace:/workspace"
        "./.cache/home:/home/${userName}"
      ];

      environment = {
        HOME = "/home/${userName}";
        TMPDIR = "/tmp";
        PATH = "/workspace/node_modules/.bin:${pkgs.lib.makeBinPath sandboxPkgs}:/bin:/usr/bin";
        SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
        NODE_ENV = "development";

        # # Standard XDG paths to keep tools out of /workspace
        # XDG_CACHE_HOME = "/home/${userName}/.cache";
        # XDG_CONFIG_HOME = "/home/${userName}/.config";
        # XDG_DATA_HOME = "/home/${userName}/.local/share";
        # XDG_STATE_HOME = "/home/${userName}/.local/state";
        #
        # # Force Oh-My-Posh to cache into ~/.cache/oh-my-posh
        # OMP_CACHE_DIR = "/home/${userName}/.cache/oh-my-posh";

        # Autoload Oh-My-Posh & dotfiles
        NU_VENDOR_AUTOLOAD_DIR = "${nushellAutoload}/share/nushell/vendor/autoload";
      };
    };
  };
}
