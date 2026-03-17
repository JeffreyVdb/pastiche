registry := "ghcr.io"
owner    := "jeffreyvdb"
prefix   := "pastiche"

version := `git describe --tags --always | sed -E 's/-g[0-9a-f]+$//' | awk '/^[0-9a-f]+$/ { print "0.0.0-" $0; next } { print }'`

# Print the computed version
version:
    @echo "{{version}}"

# Build backend or frontend image (dual-tagged: version + latest)
build component:
    #!/usr/bin/env sh
    set -eu
    case "{{component}}" in
        backend|frontend) ;;
        *) echo "Unknown component: {{component}} (expected: backend or frontend)"; exit 1 ;;
    esac
    image="{{registry}}/{{owner}}/{{prefix}}-{{component}}"
    podman build \
        -f {{component}}/Containerfile \
        -t "${image}:{{version}}" \
        -t "${image}:latest" \
        {{component}}

# Build both backend and frontend
build-all: (build "backend") (build "frontend")

# Push both tags for a component
push component:
    #!/usr/bin/env sh
    set -eu
    case "{{component}}" in
        backend|frontend) ;;
        *) echo "Unknown component: {{component}} (expected: backend or frontend)"; exit 1 ;;
    esac
    image="{{registry}}/{{owner}}/{{prefix}}-{{component}}"
    podman push "${image}:{{version}}"
    podman push "${image}:latest"

# Push both components
push-all: (push "backend") (push "frontend")

# Build and push all images
release: build-all push-all

# Deploy using production compose file
deploy:
    podman-compose -f compose.prod.yml up -d
