const os = require('os');
const interfaces = os.networkInterfaces();
for (const devName in interfaces) {
  const iface = interfaces[devName];
  iface.forEach((alias) => {
    if ((alias.family === 'IPv4' || alias.family === 4) && alias.internal === false) {
      console.log(`${devName}: http://${alias.address}:5173`);
    }
  });
}
