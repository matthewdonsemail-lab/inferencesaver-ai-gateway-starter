---
name: "Pull Request"
about: "Propose changes to the model registry or gateway starter"
---

## Summary

<!-- Describe the change — what it does and why -->

## Type of change

- [ ] New model capability submission
- [ ] Model capability update
- [ ] Provider integration
- [ ] Bug fix / infrastructure
- [ ] Documentation

## Provider submissions

If this PR adds or updates model capabilities for a provider:

<!-- The PR Checker will validate the schema and API connectivity automatically -->

- [ ] I have verified the model data is accurate
- [ ] I have run `npm run media-capabilities:validate` locally
- [ ] The provider API key is set in repository secrets (if applicable)

## Checklist

- [ ] My changes follow the existing code style
- [ ] I have updated relevant documentation
- [ ] Tests pass locally (`npm test`)