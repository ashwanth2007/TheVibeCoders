import {
    collection,
    getDocs,
    addDoc,
    setDoc,
    deleteDoc,
    doc,
    query,
    orderBy
} from 'firebase/firestore';
import { firestore } from './firebase';
import { Project } from '../App';

const getProjectsCollection = (userId: string) => collection(firestore, 'users', userId, 'projects');

export const getProjects = async (userId: string): Promise<Project[]> => {
    const projectsCollection = getProjectsCollection(userId);
    // While Firestore doesn't guarantee order, we can request it.
    // However, we don't have a timestamp field on the project itself.
    // For now, we rely on the default order, but could add a timestamp for sorting.
    const q = query(projectsCollection); 
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Project[];
};

export const addProject = async (userId: string, projectData: Omit<Project, 'id'>): Promise<Project> => {
    const projectsCollection = getProjectsCollection(userId);
    const docRef = await addDoc(projectsCollection, projectData);
    return {
        id: docRef.id,
        ...projectData
    };
};

export const updateProject = async (userId: string, projectId: string, projectData: Project): Promise<void> => {
    const projectDoc = doc(firestore, 'users', userId, 'projects', projectId);
    // Destructure to remove the id from the data being saved, as it's the document key.
    const { id, ...dataToSave } = projectData;
    await setDoc(projectDoc, dataToSave);
};

export const deleteProject = async (userId: string, projectId: string): Promise<void> => {
    const projectDoc = doc(firestore, 'users', userId, 'projects', projectId);
    await deleteDoc(projectDoc);
};
