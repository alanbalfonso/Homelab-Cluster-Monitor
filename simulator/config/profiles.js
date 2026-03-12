/**
 * Perfiles de configuración para cada Mini PC
 */
const PC_PROFILES = {
    'mini-pc-01': {
        name: 'HomeServer-Alpha',
        ram_total: 16,
        disk_total: 512,
        cpu_cores: 8,
        baseTemp: 45,
        baseCpu: 35,
        baseRam: 8,
        workloadPattern: 'high'
    },
    'mini-pc-02': {
        name: 'HomeServer-Beta',
        ram_total: 16,
        disk_total: 512,
        cpu_cores: 8,
        baseTemp: 42,
        baseCpu: 30,
        baseRam: 7,
        workloadPattern: 'medium'
    },
    'mini-pc-03': {
        name: 'HomeServer-Gamma',
        ram_total: 12,
        disk_total: 256,
        cpu_cores: 6,
        baseTemp: 40,
        baseCpu: 25,
        baseRam: 5,
        workloadPattern: 'low'
    },
    'mini-pc-04': {
        name: 'HomeServer-Delta',
        ram_total: 8,
        disk_total: 256,
        cpu_cores: 4,
        baseTemp: 50,
        baseCpu: 45,
        baseRam: 6,
        workloadPattern: 'burst'
    },
    'mini-pc-05': {
        name: 'HomeServer-Epsilon',
        ram_total: 8,
        disk_total: 128,
        cpu_cores: 4,
        baseTemp: 38,
        baseCpu: 20,
        baseRam: 3,
        workloadPattern: 'iot'
    }
};

/**
 * Obtener perfil por host_id
 */
function getProfile(hostId) {
    return PC_PROFILES[hostId];
}

/**
 * Verificar si existe un perfil
 */
function hasProfile(hostId) {
    return hostId in PC_PROFILES;
}

module.exports = {
    PC_PROFILES,
    getProfile,
    hasProfile
};
