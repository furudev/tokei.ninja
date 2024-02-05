DOCKER_PROJECT_NAME=$1
SITE_NAME=$2
LOCALHOST="127.0.0.1"
HOSTS="/etc/hosts"
ENV="docker/.env"
DOCKER_COMPOSE="docker/docker-compose.yml"
DEFAULT_DOCKER_PROJECT_NAME="site_name"
DEFAULT_SITE_NAME="SITE_NAME"
GREEN="\e[32m"
EC="\e[0m"

function checkVHostExists {
  if [[ -n $(egrep -lir --include=$HOSTS "$LOCALHOST $SITE_NAME" $HOSTS) ]]; then
    sudo sed -i '' "/$SITE_NAME/d" $HOSTS
  fi
}

function refreshHosts {
  sudo sh -c 'killall -HUP mDNSResponder'
}

function appendVHost {
  checkVHostExists

  if [[ -e $HOSTS && -r $HOSTS ]]; then
    printf "%s %s\n" $LOCALHOST $SITE_NAME | sudo tee -a $HOSTS >/dev/null
    refreshHosts
  else
    printf "❌ Cannot rewrite hosts file"
    exit 1
  fi
}

function generateEnvFile {
  echo "SITE_NAME=\"$SITE_NAME\"" >$ENV
}

function replaceDockerName {
  sed -i '' "s/$DEFAULT_DOCKER_PROJECT_NAME/$DOCKER_PROJECT_NAME/" $DOCKER_COMPOSE
}

function generateSSLCert {
  cd certs/
  mkcert $SITE_NAME || printf "❌ mkcert did not complete successfully."
  cd ..
}

function setupDocker {
  cd docker
  docker compose up -d || printf "❌ docker did not complete successfully."
  cd ..
}

function printEnd {
  printf "\n${GREEN}✅ Done. ${EC}Happy coding, Ninja! 👋\n"
}

function main {
  appendVHost
  generateEnvFile
  generateSSLCert
  replaceDockerName
  setupDocker
  printEnd
}

main
