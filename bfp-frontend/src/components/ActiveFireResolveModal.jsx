import React, { useContext, useState } from 'react';
import { MapContext } from '../logic.jsx';
import './ActiveFireResolveModal.css';

export default function ActiveFireResolveModal({ fire, onClose }) {
if (!fire) return null;
  const { resolveFire } = useContext(MapContext);
  const [details, setDetails] = useState({
    casualties:        0,
    injuries:          0,
    estimated_damage: '',
    cause:            '',
    type_of_occupancy: '',
    actions_taken:    '',
    verified_by:      '',
    attachments:      ''
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setDetails(d => ({ ...d, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...details,
      attachments: details.attachments
        .split(',')
        .map(u => u.trim())
        .filter(u => u)
    };
    await resolveFire(fire.properties.id, payload);
    onClose();
  };

  return (
    <div className="afr-modal-overlay">
      <div className="afr-modal">
        <button className="afr-close" onClick={onClose}>×</button>
        <h2>Resolve Fire</h2>
        <p><strong>Address:</strong> {fire.properties.address}</p>
        <p><strong>Barangay:</strong> {fire.properties.barangay}</p>
        <p><strong>Alarm Level:</strong> {fire.properties.alarm_level}</p>

        <form onSubmit={onSubmit}>
          <label>
            Casualties
            <input
              type="number"
              name="casualties"
              value={details.casualties}
              onChange={onChange}
            />
          </label>

          <label>
            Injuries
            <input
              type="number"
              name="injuries"
              value={details.injuries}
              onChange={onChange}
            />
          </label>

          <label>
            Estimated Damage
            <input
              type="number"
              name="estimated_damage"
              value={details.estimated_damage}
              onChange={onChange}
            />
          </label>

          <label>
            Cause / Nature of Fire
            <select
              name="cause"
              value={details.cause}
              onChange={onChange}
            >
              <option value="">-- Select Cause --</option>
              <option value="Structural">Structural</option>
              <option value="Vehicular">Vehicular</option>
              <option value="Grass/Brush">Grass/Brush</option>
              <option value="Electrical">Electrical</option>
              <option value="Chemical">Chemical</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Type of Occupancy
            <select
              name="type_of_occupancy"
              value={details.type_of_occupancy}
              onChange={onChange}
            >
              <option value="">-- Select Type --</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Industrial">Industrial</option>
              <option value="Place of Assembly">Place of Assembly</option>
              <option value="Institutional">Institutional</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Actions Taken
            <textarea
              name="actions_taken"
              value={details.actions_taken}
              onChange={onChange}
            />
          </label>

          <label>
            Verified By
            <input
              type="text"
              name="verified_by"
              value={details.verified_by}
              onChange={onChange}
            />
          </label>

          <label>
            Attachments (comma-separated URLs)
            <textarea
              name="attachments"
              value={details.attachments}
              onChange={onChange}
            />
          </label>

          <div className="afr-buttons">
            <button type="submit">Resolve</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
