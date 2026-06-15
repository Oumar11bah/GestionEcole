import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit3, Trash2, Search, DoorOpen } from 'lucide-react';
import { roomService } from '../services/api';
import MessageModal from '../components/MessageModal';

const typeLabels = { normal: 'rooms.type.normal', computer: 'rooms.type.computer', laboratory: 'rooms.type.laboratory', library: 'rooms.type.library' };
const typeColors = { normal: 'bg-blue-100 text-blue-700', computer: 'bg-purple-100 text-purple-700', laboratory: 'bg-green-100 text-green-700', library: 'bg-amber-100 text-amber-700' };
const statusColors = { available: 'bg-green-100 text-green-700', occupied: 'bg-red-100 text-red-700', maintenance: 'bg-yellow-100 text-yellow-700' };

const Rooms = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Tous');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('rooms.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };
  const [form, setForm] = useState({ name: '', code: '', capacity: 30, room_type: 'normal', status: 'available', building: '', floor: '', equipment: '', description: '' });

  useEffect(() => {
    fetchRooms();
    if (searchParams.get('action') === 'add') setShowFormModal(true);
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await roomService.getAll();
      setRooms(res.data.results || res.data);
    } catch (e) { console.error(e); }
  };

  const openEdit = (room) => {
    setEditing(room.id);
    setForm({ ...room, floor: room.floor || '' });
    setShowFormModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, floor: form.floor ? parseInt(form.floor) : null };
      if (editing) {
        await roomService.update(editing, data);
      } else {
        await roomService.create(data);
      }
      setShowFormModal(false);
      setEditing(null);
      setForm({ name: '', code: '', capacity: 30, room_type: 'normal', status: 'available', building: '', floor: '', equipment: '', description: '' });
      fetchRooms();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    showModal('warning', t('rooms.confirmation'), t('rooms.delete_confirm'), async () => {
      try { await roomService.delete(id); fetchRooms(); closeModal(); }
      catch (e) { console.error(e); closeModal(); }
    });
  };

  const filtered = rooms.filter((r) => {
    const matchSearch = search === '' || r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'Tous' || r.room_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('rooms.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('rooms.subtitle')}</p>
          </div>
          <button onClick={() => { setEditing(null); setForm({ name: '', code: '', capacity: 30, room_type: 'normal', status: 'available', building: '', floor: '', equipment: '', description: '' }); setShowModal(true); }}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> <span>{t('rooms.add_room')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('rooms.search_placeholder')} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="Tous">{t('rooms.all_types')}</option>
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
          </select>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            {filtered.length} {filtered.length > 1 ? t('rooms.rooms_plural') : t('rooms.rooms_singular')}
          </div>
          <button onClick={() => { setSearch(''); setFilterType('Tous'); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {t('rooms.reset')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">{t('rooms.no_rooms')}</div>
          ) : (
            filtered.map((room) => (
              <div key={room.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{room.name}</h3>
                    <p className="text-sm text-gray-500">{room.code}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[room.room_type] || 'bg-gray-100'}`}>
                    {t(typeLabels[room.room_type] || room.room_type)}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <span>{t('rooms.capacity')}: <strong>{room.capacity}</strong></span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[room.status]}`}>
                    {room.status === 'available' ? t('rooms.status.available') : room.status === 'occupied' ? t('rooms.status.occupied') : t('rooms.status.maintenance')}
                  </span>
                </div>
                {room.building && <p className="text-xs text-gray-400">{room.building}{room.floor ? `, ${t('rooms.floor')} ${room.floor}` : ''}</p>}
                <div className="flex flex-wrap justify-end gap-2 mt-3 pt-3 border-t">
                  <button onClick={() => openEdit(room)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(room.id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFormModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? t('rooms.edit_room') : t('rooms.new_room')}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('rooms.name')} *</label>
                  <input required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('rooms.code')} *</label>
                  <input required value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('rooms.type')}</label>
                  <select value={form.room_type} onChange={(e) => setForm({...form, room_type: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm">
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('rooms.status')}</label>
                  <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm">
                    <option value="available">{t('rooms.status.available')}</option>
                    <option value="occupied">{t('rooms.status.occupied')}</option>
                    <option value="maintenance">{t('rooms.status.maintenance')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('rooms.capacity')}</label>
                <input type="number" value={form.capacity} onChange={(e) => setForm({...form, capacity: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('rooms.building')}</label>
                  <input value={form.building} onChange={(e) => setForm({...form, building: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('rooms.floor')}</label>
                  <input type="number" value={form.floor} onChange={(e) => setForm({...form, floor: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('rooms.equipment')}</label>
                <textarea value={form.equipment} onChange={(e) => setForm({...form, equipment: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" rows="2" />
              </div>
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">{t('rooms.cancel')}</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editing ? t('rooms.edit') : t('rooms.add')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default Rooms;
