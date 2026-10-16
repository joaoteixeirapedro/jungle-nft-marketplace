import desktop from 'lighthouse/core/config/desktop-config.js'

export function lighthouseConfig(profile) {
  return {
    ...(profile === 'desktop' ? desktop : { extends: 'lighthouse:default' }),
    settings: {
      ...(profile === 'desktop' ? desktop.settings : {}),
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    },
  }
}
