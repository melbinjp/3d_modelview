module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:8080/index.html'],
      startServerCommand: 'npx http-server -p 8080',
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance': ['error', { minScore: 0.4, aggregationMethod: 'optimistic' }],
        'categories:accessibility': ['error', { minScore: 0.7, aggregationMethod: 'optimistic' }],
        'categories:best-practices': ['error', { minScore: 0.8, aggregationMethod: 'optimistic' }],
        'categories:seo': ['error', { minScore: 0.9, aggregationMethod: 'optimistic' }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
