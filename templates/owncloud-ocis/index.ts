import { Output, Services } from "~templates-utils";
import { Input } from "./meta";

export function generate(input: Input): Output {
  const services: Services = [];

  // ocis
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: `${input.servicePrefix}`,
      env: [
        `OCIS_URL=https://${input.ocisDomain}`,
        `OCIS_LOG_LEVEL=info`,
        `OCIS_LOG_COLOR=false`,
        `PROXY_TLS=false`,
        `OCIS_INSECURE=false`,
        `PROXY_ENABLE_BASIC_AUTH=false`,
        `IDM_ADMIN_PASSWORD=${input.ocisAdminPassword}`,
        `IDM_CREATE_DEMO_USERS=false`,
        //
        `SEARCH_EXTRACTOR_TYPE=tika`,
        `SEARCH_EXTRACTOR_TIKA_TIKA_URL=http://${input.projectName}_${input.servicePrefix}-tika:9998`,
        //
        `NOTIFICATIONS_SMTP_HOST=${input.projectName}_${input.servicePrefix}-inbucket`,
        `NOTIFICATIONS_SMTP_PORT=2500`,
        `NOTIFICATIONS_SMTP_SENDER=oCIS notifications <notifications@${input.ocisDomain}>`,
        `NOTIFICATIONS_SMTP_USERNAME=notifications@${input.ocisDomain}`,
        `NOTIFICATIONS_SMTP_INSECURE=true`,
      ].join("\n"),
      source: {
        type: "image",
        image: input.ocisImage,
      },
      domains: [{ name: input.ocisDomain }],
      proxy: {
        port: 9200,
        secure: true,
      },
      mounts: [
        {
          type: "file",
          mountPath: "/etc/ocis/app-registry.yaml",
          content: ocisAppRegistryYaml,
        },
        {
          type: "volume",
          name: "ocis-config",
          mountPath: "/etc/ocis",
        },
        {
          type: "volume",
          name: "ocis-data",
          mountPath: "/var/lib/ocis",
        },
      ],
      deploy: {
        command: "ocis init || true; ocis server",
      },
    },
  });

  if (input.collaboraDomain) {
    // ocis-appprovider-collabora
    services.push({
      type: "app",
      data: {
        projectName: input.projectName,
        serviceName: `${input.servicePrefix}-appprovider-collabora`,
        env: [
          `REVA_GATEWAY=${input.projectName}_${input.servicePrefix}:9142`,
          `APP_PROVIDER_GRPC_ADDR=0.0.0.0:9164`,
          `APP_PROVIDER_EXTERNAL_ADDR=${input.projectName}_${input.servicePrefix}-appprovider-collabora:9164`,
          `APP_PROVIDER_DRIVER=wopi`,
          `APP_PROVIDER_WOPI_APP_NAME=Collabora`,
          `APP_PROVIDER_WOPI_APP_ICON_URI=${input.collaboraDomain}/favicon.ico`,
          `APP_PROVIDER_WOPI_APP_URL=${input.collaboraDomain}`,
          `APP_PROVIDER_WOPI_INSECURE=false`,
          `APP_PROVIDER_WOPI_WOPI_SERVER_EXTERNAL_URL=${input.wopiDomain}`,
          `APP_PROVIDER_WOPI_FOLDER_URL_BASE_URL=${input.ocisDomain}`,
        ].join("\n"),
        source: {
          type: "image",
          image: input.ocisImage,
        },
        deploy: {
          command: "app-provider server",
        },
        mounts: [
          {
            type: "bind",
            hostPath: `/etc/easypanel/projects/${input.projectName}/${input.servicePrefix}/volumes/ocis-config`,
            mountPath: "/etc/ocis",
          },
        ],
      },
    });

    // collabora
    services.push({
      type: "app",
      data: {
        projectName: input.projectName,
        serviceName: `${input.servicePrefix}-collabora`,
        env: [
          `aliasgroup1=https://${input.wopiDomain}:443`,
          `DONT_GEN_SSL_CERT=YES`,
          `extra_params=--o:ssl.enable=false --o:ssl.termination=true --o:welcome.enable=false --o:net.frame_ancestors=${input.ocisDomain}`,
          `username=${input.collaboraUsername}`,
          `password=${input.collaboraPassword}`,
        ].join("\n"),
        source: {
          type: "image",
          image: input.collaboraImage,
        },
        deploy: {
          capAdd: ["MKNOD"],
        },
        domains: [{ name: input.collaboraDomain }],
        proxy: {
          port: 9980,
          secure: true,
        },
      },
    });
  }

  if (input.onlyofficeDomain) {
    // ocis-appprovider-onlyoffice
    services.push({
      type: "app",
      data: {
        projectName: input.projectName,
        serviceName: `${input.servicePrefix}-appprovider-onlyoffice`,
        env: [
          `REVA_GATEWAY=${input.projectName}_${input.servicePrefix}:9142`,
          `APP_PROVIDER_GRPC_ADDR=0.0.0.0:9164`,
          `APP_PROVIDER_EXTERNAL_ADDR=${input.projectName}_${input.servicePrefix}-appprovider-onlyoffice:9164`,
          `APP_PROVIDER_DRIVER=wopi`,
          `APP_PROVIDER_WOPI_APP_NAME=OnlyOffice`,
          `APP_PROVIDER_WOPI_APP_ICON_URI=${input.onlyofficeDomain}/web-apps/apps/documenteditor/main/resources/img/favicon.ico`,
          `APP_PROVIDER_WOPI_APP_URL=${input.onlyofficeDomain}`,
          `APP_PROVIDER_WOPI_INSECURE=false`,
          `APP_PROVIDER_WOPI_WOPI_SERVER_EXTERNAL_URL=${input.wopiDomain}`,
          `APP_PROVIDER_WOPI_FOLDER_URL_BASE_URL=${input.ocisDomain}`,
        ].join("\n"),
        source: {
          type: "image",
          image: input.ocisImage,
        },
        deploy: {
          command: "/bin/sh /entrypoint-override.sh",
        },
        mounts: [
          {
            type: "file",
            content: ocisAppProviderOnlyOfficeEntrypointOverrideSh,
            mountPath: "/entrypoint-override.sh",
          },
          {
            type: "bind",
            hostPath: `/etc/easypanel/projects/${input.projectName}/${input.servicePrefix}/volumes/ocis-config`,
            mountPath: "/etc/ocis",
          },
        ],
      },
    });

    // onlyoffice
    services.push({
      type: "app",
      data: {
        projectName: input.projectName,
        serviceName: `${input.servicePrefix}-onlyoffice`,
        env: [`WOPI_ENABLED=true`, `USE_UNAUTHORIZED_STORAGE=false`].join("\n"),
        source: {
          type: "image",
          image: input.onlyofficeImage,
        },
        deploy: {
          command: "/bin/sh /entrypoint-override.sh",
        },
        domains: [{ name: input.onlyofficeDomain }],
        proxy: {
          port: 80,
          secure: true,
        },
        mounts: [
          {
            type: "file",
            content: onlyofficeEntrypointOverrideSh,
            mountPath: "/entrypoint-override.sh",
          },
          {
            type: "file",
            content: onlyofficeLocalJson,
            mountPath: "/etc/onlyoffice/documentserver/local.dist.json",
          },
        ],
      },
    });
  }

  // wopi
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: `${input.servicePrefix}-wopiserver`,
      source: {
        type: "image",
        image: input.wopiImage,
      },
      proxy: {
        port: 8880,
        secure: true,
      },
      domains: [
        {
          name: input.wopiDomain,
        },
      ],
      env: [
        `WOPISERVER_INSECURE=false`,
        `WOPISECRET=${input.wopiSecret}`,
        `WOPISERVER_DOMAIN=${input.wopiDomain}`,
      ].join("\n"),
      deploy: {
        command: `/bin/sh /entrypoint-override.sh`,
      },
      mounts: [
        {
          type: "file",
          mountPath: "/entrypoint-override.sh",
          content: wopiServerEntrypointOverrideSh(input),
        },
        {
          type: "file",
          mountPath: "/etc/wopi/wopiserver.conf.dist",
          content: wopiServerConfDist,
        },
        {
          type: "volume",
          name: "recovery",
          mountPath: "/var/spool/wopirecovery",
        },
      ],
    },
  });

  // inbucket
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: `${input.servicePrefix}-inbucket`,
      env: [
        `INBUCKET_SMTP_TLSENABLED=true`,
        `INBUCKET_SMTP_TLSPRIVKEY=/tmp/server.key`,
        `INBUCKET_SMTP_TLSCERT=/tmp/server.crt`,
        `INBUCKET_STORAGE_MAILBOXMSGCAP=1000`,
      ].join("\n"),
      source: {
        type: "image",
        image: input.inbucketImage,
      },
      proxy: {
        port: 9000,
        secure: true,
      },
      deploy: {
        command:
          "apk add openssl; openssl req -subj '/CN=inbucket.test' -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout /tmp/server.key -out /tmp/server.crt; /start-inbucket.sh",
      },
    },
  });

  // tika
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: `${input.servicePrefix}-tika`,
      source: {
        type: "image",
        image: input.tikaImage,
      },
    },
  });

  return { services };
}

const ocisAppRegistryYaml = `
app_registry:
  mimetypes:
  - mime_type: application/pdf
    extension: pdf
    name: PDF
    description: PDF document
    icon: ''
    default_app: ''
    allow_creation: false
  - mime_type: application/vnd.oasis.opendocument.text
    extension: odt
    name: OpenDocument
    description: OpenDocument text document
    icon: ''
    default_app: Collabora
    allow_creation: true
  - mime_type: application/vnd.oasis.opendocument.spreadsheet
    extension: ods
    name: OpenSpreadsheet
    description: OpenDocument spreadsheet document
    icon: ''
    default_app: Collabora
    allow_creation: true
  - mime_type: application/vnd.oasis.opendocument.presentation
    extension: odp
    name: OpenPresentation
    description: OpenDocument presentation document
    icon: ''
    default_app: Collabora
    allow_creation: true
  - mime_type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
    extension: docx
    name: Microsoft Word
    description: Microsoft Word document
    icon: ''
    default_app: OnlyOffice
    allow_creation: true
  - mime_type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
    extension: xlsx
    name: Microsoft Excel
    description: Microsoft Excel document
    icon: ''
    default_app: OnlyOffice
    allow_creation: true
  - mime_type: application/vnd.openxmlformats-officedocument.presentationml.presentation
    extension: pptx
    name: Microsoft PowerPoint
    description: Microsoft PowerPoint document
    icon: ''
    default_app: OnlyOffice
    allow_creation: true
  - mime_type: application/vnd.jupyter
    extension: ipynb
    name: Jupyter Notebook
    description: Jupyter Notebook
    icon: ''
    default_app: ''
    allow_creation: true
`.trim();

const wopiServerEntrypointOverrideSh = (input: Input) =>
  `
#!/bin/sh
set -e

echo "${input.wopiSecret}" > /etc/wopi/wopisecret

cp /etc/wopi/wopiserver.conf.dist /etc/wopi/wopiserver.conf
sed -i 's/wopiserver.owncloud.test/'${input.wopiDomain}'/g' /etc/wopi/wopiserver.conf

if [ "$WOPISERVER_INSECURE" == "true" ]; then
    sed -i 's/sslverify\s=\sTrue/sslverify = False/g' /etc/wopi/wopiserver.conf
fi

/app/wopiserver.py
`.trim();

const wopiServerConfDist = `
#
# This config is based on https://github.com/cs3org/wopiserver/blob/master/wopiserver.conf
#
# wopiserver.conf
#
# Default configuration file for the WOPI server for oCIS
#
##############################################################

[general]
# Storage access layer to be loaded in order to operate this WOPI server
# only "cs3" is supported with oCIS
storagetype = cs3

# Port where to listen for WOPI requests
port = 8880

# Logging level. Debug enables the Flask debug mode as well.
# Valid values are: Debug, Info, Warning, Error.
loglevel = Error
loghandler = stream
logdest = stdout

# URL of your WOPI server or your HA proxy in front of it
wopiurl = https://wopiserver.owncloud.test

# URL for direct download of files. The complete URL that is sent
# to clients will include the access_token argument
downloadurl = https://wopiserver.owncloud.test/wopi/cbox/download

# The internal server engine to use (defaults to flask).
# Set to waitress for production installations.
internalserver = waitress

# List of file extensions deemed incompatible with LibreOffice:
# interoperable locking will be disabled for such files
nonofficetypes = .md .zmd .txt .epd

# List of file extensions to be supported by Collabora (deprecated)
codeofficetypes = .odt .ott .ods .ots .odp .otp .odg .otg .doc .dot .xls .xlt .xlm .ppt .pot .pps .vsd .dxf .wmf .cdr .pages .number .key

# WOPI access token expiration time [seconds]
tokenvalidity = 86400

# WOPI lock expiration time [seconds]
wopilockexpiration = 3600

# WOPI lock strict check: if True, WOPI locks will be compared according to specs,
# that is their representation must match. False (default) allows for a more relaxed
# comparison, which compensates incorrect lock requests from Microsoft Office Online
# on-premise setups.
wopilockstrictcheck = False

# Enable support of rename operations from WOPI apps. This is currently
# disabled by default as it has been observed that both MS Office and Collabora
# Online do not play well with this feature.
# Not supported with oCIS, must always be set to "False"
enablerename = False

# Detection of external Microsoft Office or LibreOffice locks. By default, lock files
# compatible with Office for Desktop applications are detected, assuming that the
# underlying storage can be mounted as a remote filesystem: in this case, WOPI GetLock
# and SetLock operations return such locks and prevent online apps from entering edit mode.
# This feature can be disabled in order to operate a pure WOPI server for online apps.
# Not supported with oCIS, must always be set to "False"
detectexternallocks = False

# Location of the webconflict files. By default, such files are stored in the same path
# as the original file. If that fails (e.g. because of missing permissions),
# an attempt is made to store such files in this path if specified, otherwise
# the system falls back to the recovery space (cf. io|recoverypath).
# The keywords <user_initial> and <username> are replaced with the actual username's
# initial letter and the actual username, respectively, so you can use e.g.
# /your_storage/home/user_initial/username
#conflictpath = /

# ownCloud's WOPI proxy configuration. Disabled by default.
#wopiproxy = https://external-wopi-proxy.com
#wopiproxysecretfile = /path/to/your/shared-key-file
#proxiedappname = Name of your proxied app

[security]
# Location of the secret files. Requires a restart of the
# WOPI server when either the files or their content change.
wopisecretfile = /etc/wopi/wopisecret
# iop secret is not used for cs3 storage type
#iopsecretfile = /etc/wopi/iopsecret

# Use https as opposed to http (requires certificate)
usehttps = no

# Certificate and key for https. Requires a restart
# to apply a change.
wopicert = /etc/grid-security/host.crt
wopikey = /etc/grid-security/host.key

[bridge]
# SSL certificate check for the connected apps
sslverify = True

# Minimal time interval between two consecutive save operations [seconds]
#saveinterval = 200

# Minimal time interval before a closed file is WOPI-unlocked [seconds]
#unlockinterval = 90

# CodiMD: disable creating zipped bundles when files contain pictures
#disablezip = False

[io]
# Size used for buffered reads [bytes]
chunksize = 4194304

# Path to a recovery space in case of I/O errors when reaching to the remote storage.
# This is expected to be a local path, and it is provided in order to ease user support.
# Defaults to the indicated spool folder.
recoverypath = /var/spool/wopirecovery

[cs3]
# Host and port of the Reva(-like) CS3-compliant GRPC gateway endpoint
revagateway = ocis:9142

# Reva/gRPC authentication token expiration time [seconds]
# The default value matches Reva's default
authtokenvalidity = 3600

# SSL certificate check for Reva
sslverify = True
`.trim();

const ocisAppProviderOnlyOfficeEntrypointOverrideSh = `
#!/bin/sh
set -e

apk add curl

#TODO: app driver itself should try again until OnlyOffice is up...

retries=10
while [[ $retries -gt 0 ]]; do
    if curl --silent --show-error --fail http://onlyoffice/hosting/discovery > /dev/null; then
        ocis app-provider server
    else
        echo "OnlyOffice is not yet available, trying again in 10 seconds"
        sleep 10
        retries=$((retries - 1))
    fi
done
echo 'OnlyOffice was not available after 100 seconds'
exit 1
`.trim();

const onlyofficeEntrypointOverrideSh = `
#!/bin/sh
set -e

# we can't mount it directly because the run-document-server.sh script wants to move it
cp /etc/onlyoffice/documentserver/local.dist.json /etc/onlyoffice/documentserver/local.json

/app/ds/run-document-server.sh
`.trim();

const onlyofficeLocalJson = `
{
  "services": {
    "CoAuthoring": {
      "sql": {
        "type": "postgres",
        "dbHost": "localhost",
        "dbPort": "5432",
        "dbName": "onlyoffice",
        "dbUser": "onlyoffice",
        "dbPass": "onlyoffice"
      },
      "token": {
        "enable": {
          "request": {
            "inbox": true,
            "outbox": true
          },
          "browser": true
        },
        "inbox": {
          "header": "Authorization"
        },
        "outbox": {
          "header": "Authorization"
        }
      },
      "secret": {
        "inbox": {
          "string": "B8LjkNqGxn6gf8bkuBUiMwyuCFwFddnu"
        },
        "outbox": {
          "string": "B8LjkNqGxn6gf8bkuBUiMwyuCFwFddnu"
        },
        "session": {
          "string": "B8LjkNqGxn6gf8bkuBUiMwyuCFwFddnu"
        }
      }
    }
  },
  "rabbitmq": {
    "url": "amqp://guest:guest@localhost"
  },
  "FileConverter": {
		"converter": {
			"inputLimits": [
				{
				"type": "docx;dotx;docm;dotm",
				"zip": {
					"uncompressed": "1GB",
					"template": "*.xml"
				}
				},
				{
				"type": "xlsx;xltx;xlsm;xltm",
				"zip": {
					"uncompressed": "1GB",
					"template": "*.xml"
				}
				},
				{
				"type": "pptx;ppsx;potx;pptm;ppsm;potm",
				"zip": {
					"uncompressed": "1GB",
					"template": "*.xml"
				}
				}
			]
		}
	}

}
`;
