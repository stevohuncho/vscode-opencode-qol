install:
    npm run pack
    code --install-extension ./dist/opencode-qol.vsix --force

precommit:
    npm run lint
    npm run format:check
    npm run test:unit
    npm run compile
