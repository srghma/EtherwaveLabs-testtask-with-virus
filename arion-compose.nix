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

    # Shell & aesthetics
    nushell
    oh-my-posh
    nushellAutoload

    # Runtimes
    nodejs_22
  ];
in
{
  project.name = "web3-sandbox";

  # ---------------------------------------------------------------------------
  # 1. MongoDB Database Service
  # ---------------------------------------------------------------------------
  services.mongo = {
    service = {
      image = "mongo:latest";
      restart = "unless-stopped";

      ports = [
        "27017:27017"
      ];

      volumes = [
        "./.cache/mongo:/data/db"
      ];
    };
  };

  # ---------------------------------------------------------------------------
  # 2. Backend API Service (Express + Mongoose)
  # ---------------------------------------------------------------------------
  services.backend = {
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
      working_dir = "/workspace/backend";

      defaultExec = [ "nu" ];

      command = [
        "npm"
        "run"
        "dev"
      ];

      depends_on = [
        "mongo"
      ];

      tmpfs = [
        "/tmp"
      ];

      ports = [
        "5000:5000"
      ];

      volumes = [
        "./workspace:/workspace"
        "./.cache/home:/home/${userName}"
      ];

      environment = {
        HOME = "/home/${userName}";
        TMPDIR = "/tmp";
        PATH = "/workspace/backend/node_modules/.bin:${pkgs.lib.makeBinPath sandboxPkgs}:/bin:/usr/bin";
        SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
        NODE_ENV = "development";
        PORT = "5000";
        MONGO_URI = "mongodb://mongo:27017/crypto-tracker";
        JWT_SECRET = "your-jwt-secret";

        NU_VENDOR_AUTOLOAD_DIR = "${nushellAutoload}/share/nushell/vendor/autoload";
      };
    };
  };

  # ---------------------------------------------------------------------------
  # 3. Frontend Service (Vite + React)
  # ---------------------------------------------------------------------------
  services.crypto = {
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
      working_dir = "/workspace/crypto";

      defaultExec = [ "nu" ];

      command = [
        "npm"
        "run"
        "dev"
      ];

      depends_on = [
        "backend"
      ];

      tmpfs = [
        "/tmp"
      ];

      ports = [
        "5173:5173"
      ];

      volumes = [
        "./workspace:/workspace"
        "./.cache/home:/home/${userName}"
      ];

      environment = {
        HOME = "/home/${userName}";
        TMPDIR = "/tmp";
        PATH = "/workspace/crypto/node_modules/.bin:${pkgs.lib.makeBinPath sandboxPkgs}:/bin:/usr/bin";
        SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
        NODE_ENV = "development";

        NU_VENDOR_AUTOLOAD_DIR = "${nushellAutoload}/share/nushell/vendor/autoload";
      };
    };
  };
}
