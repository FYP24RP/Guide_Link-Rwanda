<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDbSIDCfXNGpKifvhV126frr-blOtytXEA",
    authDomain: "guidelink-rwanda.firebaseapp.com",
    projectId: "guidelink-rwanda",
    storageBucket: "guidelink-rwanda.firebasestorage.app",
    messagingSenderId: "354144844756",
    appId: "1:354144844756:web:65818ecb3f380d7966b441",
    measurementId: "G-164GLYTZ3E"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
