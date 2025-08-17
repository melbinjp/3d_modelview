module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:8080/index.html"],
      startServerCommand: "npx http-server -p 8080",
    },
    assert: {
      preset: "lighthouse:no-pwa",
      assertions: {
        "categories:performance": [
          "error",
          { minScore: 0.85, aggregationMethod: "median" },
        ],
        "categories:accessibility": [
          "error",
          { minScore: 0.90, aggregationMethod: "median" },
        ],
        "categories:best-practices": [
          "error",
          { minScore: 0.85, aggregationMethod: "median" },
        ],
        "categories:seo": [
          "error",
          { minScore: 0.90, aggregationMethod: "median" },
        ],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
