// WeaponConfig.js
// Data structures for weapon configurations and stats.

const WeaponConfigs = {
    MachineGun: {
        name: 'Machine Gun',
        ammoCount: 500,
        cooldownTime: 0.08,
        damageAmount: 10,
        reloadTime: 2.0,
        projectileType: 'bullet',
        maxHeat: 100,
        heatPerShot: 7,
        coolRate: 20,
    },
    Cannon: {
        name: 'Cannon',
        ammoCount: 40,
        cooldownTime: 0.5,
        damageAmount: 50,
        reloadTime: 3.0,
        projectileType: 'shell',
        maxHeat: 60,
        heatPerShot: 18,
        coolRate: 15,
    },
    Missile: {
        name: 'Missile',
        ammoCount: 4,
        cooldownTime: 2.5,
        damageAmount: 120,
        reloadTime: 5.0,
        projectileType: 'missile',
    },
    RocketPod: {
        name: 'Rocket Pod',
        ammoCount: 20,
        cooldownTime: 0.2,
        damageAmount: 25,
        reloadTime: 4.0,
        projectileType: 'rocket',
    },
};

export default WeaponConfigs;
