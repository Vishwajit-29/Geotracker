const deps = ['expo','react','react-native','expo-router','expo-location','expo-task-manager','expo-notifications','react-native-maps'];
deps.forEach(d => {
  try {
    const p = require(`./node_modules/${d}/package.json`);
    console.log(`${d}: ${p.version}`);
  } catch(e) { console.log(`${d}: NOT FOUND`); }
});
