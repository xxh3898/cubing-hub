import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const nginxConfig = await readFile(
  new URL("../nginx/home-server.conf", import.meta.url),
  "utf8",
);
const realIpConfig = await readFile(
  new URL("../nginx/cloudflare-edge-real-ip.conf", import.meta.url),
  "utf8",
);

test("should_trustOnlyPinnedSharedConnector_when_realIpIsEnabled", () => {
  assert.match(realIpConfig, /set_real_ip_from 172\.18\.0\.2;/);
  assert.match(realIpConfig, /real_ip_header CF-Connecting-IP;/);
  assert.match(realIpConfig, /real_ip_recursive off;/);
  assert.doesNotMatch(
    realIpConfig,
    /set_real_ip_from (?:0\.0\.0\.0\/0|10\.0\.0\.0\/8|172\.18\.0\.0\/16|192\.168\.0\.0\/16);/,
  );
});

test("should_honorForwardedSchemeOnlyFromPinnedConnector", () => {
  assert.match(
    nginxConfig,
    /map \$realip_remote_addr \$trusted_tunnel_request \{[\s\S]*172\.18\.0\.2 1;[\s\S]*default 0;[\s\S]*\}/,
  );
  assert.match(
    nginxConfig,
    /map "\$trusted_tunnel_request:\$http_x_forwarded_proto" \$external_scheme \{[\s\S]*"1:https" https;[\s\S]*default \$scheme;[\s\S]*\}/,
  );
  assert.match(
    nginxConfig,
    /add_header Strict-Transport-Security \$strict_transport_security always;/,
  );
});

test("should_routeApexWebApiAndUploadsWithoutExtraActuatorExposure", () => {
  assert.match(
    nginxConfig,
    /server_name cubing-hub\.com;[\s\S]*return 308 https:\/\/www\.cubing-hub\.com\$request_uri;/,
  );
  assert.match(
    nginxConfig,
    /server_name www\.cubing-hub\.com;[\s\S]*try_files \$uri \$uri\/ \/index\.html;/,
  );
  assert.match(
    nginxConfig,
    /server_name api\.cubing-hub\.com;[\s\S]*location \/api \{[\s\S]*proxy_pass http:\/\/cubinghub_api;/,
  );
  assert.match(
    nginxConfig,
    /location = \/actuator\/health \{[\s\S]*proxy_pass http:\/\/cubinghub_api;/,
  );
  assert.match(
    nginxConfig,
    /location \^~ \/actuator\/ \{[\s\S]*return 404;/,
  );
  assert.match(
    nginxConfig,
    /location \/uploads\/ \{[\s\S]*alias \/data\/post-images\//,
  );
});

test("should_forwardExternalRequestMetadataToApi", () => {
  assert.equal(
    countMatches(
      nginxConfig,
      /proxy_set_header X-Forwarded-Proto \$external_scheme;/g,
    ),
    2,
  );
  assert.equal(
    countMatches(
      nginxConfig,
      /proxy_set_header X-Forwarded-Port \$external_port;/g,
    ),
    2,
  );
  assert.equal(
    countMatches(
      nginxConfig,
      /proxy_set_header X-Forwarded-For \$remote_addr;/g,
    ),
    2,
  );
});

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}
