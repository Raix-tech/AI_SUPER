import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuoazienda.portalesuper',
  appName: 'PortaleSuper',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;