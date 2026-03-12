/**
 * Generador de métricas realistas para simulación de nodos
 */
class MetricsGenerator {
    constructor(profile, interval) {
        this.profile = profile;
        this.interval = interval;
        this.state = {
            uptime: Math.random() * 100,
            disk_used: 0,
            last_cpu_spike: 0
        };
    }

    /**
     * Generar CPU según patrón de carga
     */
    _generateCPU(time, iteration) {
        let cpu_usage = this.profile.baseCpu;
        
        switch(this.profile.workloadPattern) {
            case 'high':
                cpu_usage += Math.sin(time / 300) * 15 + Math.random() * 10;
                break;
            case 'medium':
                cpu_usage += Math.sin(time / 400) * 10 + Math.random() * 8;
                break;
            case 'low':
                cpu_usage += Math.sin(time / 600) * 5 + Math.random() * 5;
                break;
            case 'burst':
                if (iteration % 24 === 0) {
                    this.state.last_cpu_spike = 60 + Math.random() * 30;
                }
                cpu_usage += this.state.last_cpu_spike * Math.exp(-(iteration % 24) / 5) + Math.random() * 5;
                break;
            case 'iot':
                cpu_usage += Math.random() * 3;
                break;
        }
        
        return Math.max(5, Math.min(95, cpu_usage));
    }

    /**
     * Generar RAM con crecimiento y GC
     */
    _generateRAM(iteration) {
        const ram_growth = (iteration * 0.001) % 2;
        const ram_used_gb = this.profile.baseRam + ram_growth + (Math.random() - 0.5) * 0.5;
        const ram_usage_percent = (ram_used_gb / this.profile.ram_total) * 100;
        
        return {
            ram_used_gb: parseFloat(ram_used_gb.toFixed(2)),
            ram_usage_percent: parseFloat(ram_usage_percent.toFixed(2))
        };
    }

    /**
     * Generar temperatura correlacionada con CPU
     */
    _generateTemperature(cpu_usage, time) {
        const temp = this.profile.baseTemp + 
                     (cpu_usage / 100) * 20 + 
                     Math.sin(time / 7200) * 5 + 
                     (Math.random() - 0.5) * 2;
        return parseFloat(temp.toFixed(2));
    }

    /**
     * Generar uso de disco con crecimiento lento
     */
    _generateDisk() {
        this.state.disk_used += Math.random() * 0.001;
        const disk_used_gb = (this.profile.disk_total * 0.3) + this.state.disk_used;
        const disk_usage_percent = (disk_used_gb / this.profile.disk_total) * 100;
        
        return {
            disk_used_gb: parseFloat(disk_used_gb.toFixed(2)),
            disk_usage_percent: parseFloat(disk_usage_percent.toFixed(2))
        };
    }

    /**
     * Generar tráfico de red con bursts
     */
    _generateNetwork() {
        const network_in_mbps = Math.random() < 0.1 
            ? Math.random() * 100 + 50
            : Math.random() * 10 + 2;
        
        const network_out_mbps = network_in_mbps * (0.3 + Math.random() * 0.4);
        
        return {
            network_in_mbps: parseFloat(network_in_mbps.toFixed(2)),
            network_out_mbps: parseFloat(network_out_mbps.toFixed(2))
        };
    }

    /**
     * Generar conjunto completo de métricas
     */
    generate(hostId, iteration) {
        const time = Date.now() / 1000;
        
        const cpu_usage = this._generateCPU(time, iteration);
        const { ram_used_gb, ram_usage_percent } = this._generateRAM(iteration);
        const temperature = this._generateTemperature(cpu_usage, time);
        const { disk_used_gb, disk_usage_percent } = this._generateDisk();
        const { network_in_mbps, network_out_mbps } = this._generateNetwork();
        
        this.state.uptime += this.interval / 3600000;
        
        return {
            host_id: hostId,
            cpu_usage,
            ram_used_gb,
            ram_usage_percent,
            temperature,
            disk_used_gb,
            disk_usage_percent,
            network_in_mbps,
            network_out_mbps,
            uptime_hours: parseInt(this.state.uptime)
        };
    }

    /**
     * Resetear estado
     */
    reset() {
        this.state = {
            uptime: Math.random() * 100,
            disk_used: 0,
            last_cpu_spike: 0
        };
    }
}

module.exports = MetricsGenerator;
