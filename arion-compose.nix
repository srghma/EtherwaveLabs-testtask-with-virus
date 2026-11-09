{ pkgs, ... }:
{
  project.name = "web3-sandbox";

  services.sandbox = {
    service = {
      useHostStore = true;
      command = [
        "sleep"
        "infinity"
      ];
      working_dir = "/workspace";
      ports = [
        "3000:3000"
      ];
      volumes = [
        ".:/workspace"
      ];
      environment = {
        PATH = "/workspace/node_modules/.bin:${
          pkgs.lib.makeBinPath (
            with pkgs;
            [
              bashInteractive
              coreutils
              cacert
              git
              nodejs_22
              bun
              which
              curl
              jq
              foundry
            ]
          )
        }:/bin:/usr/bin";

        SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
        NODE_ENV = "development";
      };
    };

    image.enableRecommendedContents = true;
    image.contents = with pkgs; [
      bashInteractive
      coreutils
      cacert
      git
      nodejs_22
      bun
      which
      curl
      jq
      foundry
    ];
  };
}
