// Configuração do mapa (centro inicial: Rio de Janeiro)
const map = L.map('map').setView([-22.908333, -43.196388], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Dicionário de marcadores (para atualização dinâmica)
const busMarkers = {};

// Conexão WebSocket (assumindo que o backend está em 'ws://localhost:8080/ws/gps')
const socket = new WebSocket('ws://localhost:8081/gps-updates');

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateMap(data);
};

function updateMap(gpsDataList) {
    const now = new Date();

    gpsDataList.forEach(bus => {
        const lastUpdate = new Date(bus.datahora);
        const formattedDate = lastUpdate.toLocaleString('pt-BR');
        const minutesWithoutSignal = (now - lastUpdate) / (1000 * 60);

        // Remove marcador antigo (se existir)
        if (busMarkers[bus.ordem]) {
            map.removeLayer(busMarkers[bus.ordem]);
        }

        // Cria ícone padrão do Leaflet (azul ou vermelho)
        const marker = L.marker([bus.latitude, bus.longitude], {
            icon: new L.Icon({
                iconUrl: minutesWithoutSignal > 2 
                    ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png' 
                    : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                iconSize: [15, 20],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
            })
        }).addTo(map);

        // Tooltip
        marker.bindTooltip(`
            <strong>Ônibus ${bus.ordem} (Linha ${bus.linha})</strong><br>
            Última atualização: ${formattedDate}<br>
            Velocidade: ${bus.velocidade} km/h<br>
            ${minutesWithoutSignal > 2 ? '🛑 Área de sombra' : '✅ Ativo'}
        `);

        busMarkers[bus.ordem] = marker;
    });

    // Busca
document.getElementById('search-button').addEventListener('click', () => {
    const searchTerm = document.getElementById('search-input').value.trim().toUpperCase();
    if (!searchTerm) return;

    // Fecha todos os tooltips e reseta marcadores
    Object.values(busMarkers).forEach(marker => {
        marker.setOpacity(0.5); // Opacidade reduzida para ônibus não encontrados
        marker.closeTooltip();
    });

    // Filtra e destaca os resultados
    let found = false;
    Object.entries(busMarkers).forEach(([ordem, marker]) => {
        const bus = marker._tooltip._content.includes(searchTerm);
        if (bus) {
            marker.setOpacity(1);
            marker.openTooltip();
            map.setView(marker.getLatLng(), 15); // Zoom no ônibus
            found = true;
        }
    });

    if (!found) alert("Nenhum ônibus encontrado!");
});

// Reset
document.getElementById('reset-button').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    Object.values(busMarkers).forEach(marker => {
        marker.setOpacity(1);
        marker.closeTooltip();
    });
    map.setView([-22.85715, -43.37126], 12); // Volta ao zoom inicial
});
}