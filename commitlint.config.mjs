const commitlintConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-case": [0],
    "header-max-length": [2, "always", 72],
  },
}

export default commitlintConfig
