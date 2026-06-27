import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { classService } from '../services/api';
import MessageModal from '../components/MessageModal';
import { getDefaultAcademicYear, fetchAcademicYears } from '../utils/preferences';
import Label from './Label';

const ClassForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? 'Confirmer' : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };
  
  const [formData, setFormData] = useState({
    name: '',
    cycle_id: '',
    class_teacher_id: '',
    academic_year: getDefaultAcademicYear() || '2024-2025',
  });

  useEffect(() => {
    fetchData();
    fetchAcademicYears().then(yrs => {
      setAcademicYears(yrs);
      if (yrs.length > 0 && !formData.academic_year) {
        setFormData(prev => ({...prev, academic_year: yrs[0].name}));
      }
    });
    if (id) {
      fetchClass();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const [cyclesRes, teachersRes] = await Promise.all([
        classService.getAll({ page_size: 100 }),
        // Note: Remplacer par API teachers quand disponible
      ]);
      setCycles(cyclesRes.data.results || cyclesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const fetchClass = async () => {
    try {
      setLoading(true);
      const response = await classService.getById(id);
      const cls = response.data;
      setFormData({
        name: cls.name || '',
        cycle_id: cls.cycle_id || '',
        class_teacher_id: cls.class_teacher_id || '',
        academic_year: cls.academic_year || getDefaultAcademicYear() || '2024-2025',
      });
    } catch (error) {
      console.error('Failed to fetch class:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (id) {
        await classService.update(id, formData);
      } else {
        await classService.create(formData);
      }
      navigate('/classes');
    } catch (error) {
      console.error('Failed to save class:', error);
      showModal('error', 'Erreur', "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">
            {id ? 'Modifier une classe' : 'Ajouter une classe'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label required>Nom de la classe</Label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <Label required>Cycle</Label>
                <select
                  name="cycle_id"
                  value={formData.cycle_id}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Sélectionner un cycle</option>
                  {cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label required>Année académique</Label>
                <select
                  name="academic_year"
                  value={formData.academic_year}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.name}>{y.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/classes')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default ClassForm;
