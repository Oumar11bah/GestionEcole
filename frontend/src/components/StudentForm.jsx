import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentService } from '../services/api';
import MessageModal from '../components/MessageModal';
import Label from './Label';

const StudentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? 'Confirmer' : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    matricule: '',
    gender: 'M',
    date_of_birth: '',
    class_assigned_id: '',
    parent_id: '',
    address: '',
    phone_number: '',
  });

  useEffect(() => {
    fetchData();
    if (id) {
      fetchStudent();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const [classesRes, parentsRes] = await Promise.all([
        studentService.getAll({ page_size: 100 }),
        // Note: Remplacer par API parents quand disponible
      ]);
      setClasses(classesRes.data.results || classesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const response = await studentService.getById(id);
      const student = response.data;
      setFormData({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        matricule: student.matricule || '',
        gender: student.gender || 'M',
        date_of_birth: student.date_of_birth || '',
        class_assigned_id: student.class_assigned_id || '',
        parent_id: student.parent_id || '',
        address: student.address || '',
        phone_number: student.phone_number || '',
      });
    } catch (error) {
      console.error('Failed to fetch student:', error);
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
        await studentService.update(id, formData);
      } else {
        await studentService.create(formData);
      }
      navigate('/students');
    } catch (error) {
      console.error('Failed to save student:', error);
      showModal('error', 'Erreur', "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">
            {id ? 'Modifier un élève' : 'Ajouter un élève'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Matricule</Label>
                <input
                  type="text"
                  name="matricule"
                  value={formData.matricule}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed shadow-sm sm:text-sm"
                />
              </div>

              <div>
                <Label required>Nom</Label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <Label required>Prénom</Label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <Label>Genre</Label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>

              <div>
                <Label required>Date de naissance</Label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <Label required>Classe</Label>
                <select
                  name="class_assigned_id"
                  value={formData.class_assigned_id}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Sélectionner une classe</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.display_name || cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Téléphone</Label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/students')}
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

export default StudentForm;
