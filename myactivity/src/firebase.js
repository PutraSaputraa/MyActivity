import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyD6eLbHsO6BhcGd_8SE1XELeyVr2iZ4tOo',
  authDomain: 'myactivity-2d817.firebaseapp.com',
  projectId: 'myactivity-2d817',
  storageBucket: 'myactivity-2d817.firebasestorage.app',
  messagingSenderId: '949442904502',
  appId: '1:949442904502:web:168b86f6ea4b6d57c04117',
  measurementId: 'G-73139Z1QT0',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)

