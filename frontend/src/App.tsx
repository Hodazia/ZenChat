import './App.css'
import { Chatting } from './components/Chatting'
import { Analytics } from '@vercel/analytics/react';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <>
      <Chatting />
      <Analytics />
    </>
  )
}

/*
function Rdm() {
  const notify = () => {
    toast.info('🦄 Wow so easy!', {
      position: "top-left" as ToastPosition,
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
    });
  };

  return (
    <div>
      <button onClick={notify}>Notify!</button>
      <ToastContainer
        position="top-left"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}
*/
export default App
