/**
 * =========================================================================
 * مؤسسة الفتح (El Feth) - وحدة المزامنة السحابية اللحظية مع Firebase
 * المطور: Aminebens_off
 * المشروع: elfethbatna
 * =========================================================================
 */

// 🔑 إعدادات مشروع Firebase لمؤسسة الفتح (elfethbatna)
const firebaseConfig = {
  apiKey: "AIzaSyB-und0ze38bbleAZHlqJhueFwrFaSNVaw",
  authDomain: "elfethbatna.firebaseapp.com",
  databaseURL: "https://elfethbatna-default-rtdb.firebaseio.com",
  projectId: "elfethbatna",
  storageBucket: "elfethbatna.firebasestorage.app",
  messagingSenderId: "164820408359",
  appId: "1:164820408359:web:5bdf8095c30c17d5549602",
  measurementId: "G-FGQZGH0W0Z"
};

class FirebaseSyncService {
  constructor() {
    this.isInitialized = false;
    this.db = null;
    this.rtdb = null;
    this.docRef = null;
    this.unsubscribe = null;
    this.isRemoteUpdating = false;
    this.init();
  }

  init() {
    if (!firebaseConfig.apiKey || !window.firebase) {
      console.log("ℹ️ Firebase SDK غير محمل بعد.");
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      // 1. تهيئة Cloud Firestore
      if (typeof firebase.firestore === "function") {
        try {
          this.db = firebase.firestore();
          // تفعيل الحفظ دون اتصال
          this.db.enablePersistence({ synchronizeTabs: true }).catch(err => {
            console.log("Firestore persistence mode:", err.code);
          });
          this.docRef = this.db.collection("elfeth_ledger").doc("main_state");
        } catch (e) {
          console.warn("Firestore init notice:", e);
        }
      }

      // 2. تهيئة Realtime Database (كدعم إضافي وتلقائي)
      if (typeof firebase.database === "function" && firebaseConfig.databaseURL) {
        try {
          this.rtdb = firebase.database();
        } catch (e) {}
      }

      this.isInitialized = true;
      console.log("🔥 تم ربط وتهيئة Firebase بنجاح لمشروع: elfethbatna!");

      // بدء الاستماع للتحديثات اللحظية من كافة الأجهزة
      this.listenToRemoteChanges();

    } catch (err) {
      console.error("Firebase init error:", err);
    }
  }

  // 📥 الاستماع اللحظي: أي تعديل من هاتف أو حاسوب آخر يظهر فوراً بدون تحديث الصفحة
  listenToRemoteChanges() {
    if (this.docRef) {
      this.unsubscribe = this.docRef.onSnapshot(doc => {
        if (doc.exists) {
          const remoteData = doc.data().ledgerData;
          if (remoteData && window.store) {
            console.log("🔄 تم استلام تحديث لحظي جديد من Firestore!");
            this.isRemoteUpdating = true;
            window.store.data = remoteData;
            window.store.saveData(false);
            if (typeof window.renderAll === "function") {
              window.renderAll();
            }
            this.isRemoteUpdating = false;
          }
        }
      }, err => {
        console.log("Firestore listener note:", err.message);
      });
    }

    // استماع إضافي عبر Realtime Database إن وجد
    if (this.rtdb) {
      try {
        this.rtdb.ref("elfeth_ledger/main_state").on("value", snapshot => {
          const val = snapshot.val();
          if (val && val.ledgerData && window.store && !this.isRemoteUpdating) {
            console.log("🔄 تم استلام تحديث لحظي من Realtime Database!");
            this.isRemoteUpdating = true;
            window.store.data = val.ledgerData;
            window.store.saveData(false);
            if (typeof window.renderAll === "function") {
              window.renderAll();
            }
            this.isRemoteUpdating = false;
          }
        });
      } catch (e) {}
    }
  }

  // 📤 رفع أي عملية جديدة فوراً للسحابة
  async pushData(data) {
    if (!this.isInitialized || this.isRemoteUpdating) return;

    // رفع إلى Firestore
    if (this.docRef) {
      try {
        await this.docRef.set({
          ledgerData: data,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: window.store?.currentUser?.name || "المدير العام"
        }, { merge: true });
        console.log("✓ تم حفظ التعديل في Firestore سحابياً!");
      } catch (err) {
        console.log("Firestore push note:", err.message);
      }
    }

    // رفع احتياطي إلى Realtime Database
    if (this.rtdb) {
      try {
        await this.rtdb.ref("elfeth_ledger/main_state").set({
          ledgerData: data,
          updatedAt: new Date().toISOString(),
          updatedBy: window.store?.currentUser?.name || "المدير العام"
        });
      } catch (e) {}
    }
  }

  // فحص الاتصال اليدوي من زر الإعدادات
  async testConnection() {
    if (!this.isInitialized) {
      alert("⚠️ Firebase غير مهيأ بعد.");
      return false;
    }
    try {
      const pingTime = new Date().toISOString();
      if (this.docRef) {
        await this.docRef.set({ testPing: pingTime }, { merge: true });
      }
      if (this.rtdb) {
        await this.rtdb.ref("elfeth_ledger/testPing").set(pingTime);
      }
      alert("✅ تم فحص وتأكيد اتصال Firebase بنجاح 100%!\nالمشروع: elfethbatna\nالحالة: متصل وسريع ⚡");
      return true;
    } catch (err) {
      alert("⚠️ تعذر الاتصال بـ Firebase:\n" + err.message);
      return false;
    }
  }
}

// إنشاء نسخة الخدمة العامة
window.firebaseSync = new FirebaseSyncService();
