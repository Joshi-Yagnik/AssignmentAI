import { api } from './api';

/**
 * Get all study materials
 */
export const getMaterials = async () => {
  const { data } = await api.get('/materials');
  return data;
};

/**
 * Create a new study material record
 */
export const createMaterial = async (materialData) => {
  const { data } = await api.post('/materials', materialData);
  return data;
};

/**
 * Delete a study material
 */
export const deleteMaterial = async (id) => {
  const { data } = await api.delete(`/materials/${id}`);
  return data;
};
