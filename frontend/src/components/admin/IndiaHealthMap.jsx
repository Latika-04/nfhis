import React from 'react';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
} from 'react-leaflet';

import L from 'leaflet';

const hospitals = [

  {
    name: 'AIIMS Delhi',
    city: 'Delhi',
    position: [28.6139, 77.2090],
    status: 'Critical',
    patients: 1240,
    color: '#ff4d6d',
  },

  {
    name: 'Apollo Hyderabad',
    city: 'Hyderabad',
    position: [17.3850, 78.4867],
    status: 'Stable',
    patients: 980,
    color: '#00d4ff',
  },

  {
    name: 'Care Chennai',
    city: 'Chennai',
    position: [13.0827, 80.2707],
    status: 'Warning',
    patients: 760,
    color: '#ffd166',
  },

  {
    name: 'Fortis Mumbai',
    city: 'Mumbai',
    position: [19.0760, 72.8777],
    status: 'Stable',
    patients: 1120,
    color: '#00ff87',
  },

];

const createIcon = (color) =>
  new L.DivIcon({
    html: `
      <div style="
        width:18px;
        height:18px;
        border-radius:50%;
        background:${color};
        box-shadow:0 0 20px ${color};
        border:2px solid white;
      "></div>
    `,
    className: '',
  });

export default function IndiaHealthMap() {

  return (

    <div
      className="
        rounded-[32px]
        overflow-hidden
        border border-cyan-400/10
        bg-[#071028]
      "
      style={{
        height: '700px',
      }}
    >

      <MapContainer
        center={[22.5937, 78.9629]}
        zoom={5}
        scrollWheelZoom={true}
        style={{
          height: '100%',
          width: '100%',
        }}
      >

        {/* MAP TILES */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* HOSPITALS */}
        {hospitals.map((hospital, i) => (

          <React.Fragment key={i}>

            {/* GLOW */}
            <Circle
              center={hospital.position}
              radius={50000}
              pathOptions={{
                color: hospital.color,
                fillColor: hospital.color,
                fillOpacity: 0.15,
              }}
            />

            {/* MARKER */}
            <Marker
              position={hospital.position}
              icon={createIcon(hospital.color)}
            >

              <Popup>

                <div style={{
                  minWidth: '220px',
                  padding: '6px',
                }}>

                  <h3 style={{
                    marginBottom: '8px',
                    color: '#00d4ff',
                  }}>
                    {hospital.name}
                  </h3>

                  <p>
                    <strong>City:</strong> {hospital.city}
                  </p>

                  <p>
                    <strong>Status:</strong> {hospital.status}
                  </p>

                  <p>
                    <strong>Patients:</strong> {hospital.patients}
                  </p>

                </div>

              </Popup>

            </Marker>

          </React.Fragment>

        ))}

      </MapContainer>

    </div>

  );
}