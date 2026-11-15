        const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:5000' : window.location.origin;
        const authState = {
            token: localStorage.getItem('oromia_admin_token') || '',
            username: localStorage.getItem('oromia_admin_username') || '',
            role: localStorage.getItem('oromia_admin_role') || ''
        };

        const customerState = {
            token: localStorage.getItem('oromia_customer_token') || '',
            fullName: localStorage.getItem('oromia_customer_name') || '',
            phone: localStorage.getItem('oromia_customer_phone') || ''
        };

        const adminState = {
            queue: [],
            loans: [],
            contactMessages: []
        };
        let activeTicketNumber = '';
        let activePublicPage = 'services';
        let contactMessageSending = false;
        let contactStatusTimer = 0;

        const i18n = {
            en: {
                heroTitle: 'Babile Branch Smart Service Portal',
                heroSub: 'Fast queues & agricultural loan eligibility estimator for East Hararghe traders',
                qTitle: 'Get Digital Queue Ticket',
                name: 'Full Name',
                phone: 'Phone Number',
                accountNumber: 'Bank Account Number',
                service: 'Service Type',
                btnQ: 'Get Ticket',
                loanTitle: 'Micro-Loan Pre-Screening',
                collateral: 'Collateral Type',
                assetVal: 'Estimated Asset Value (ETB)',
                btnL: 'Estimate Eligibility',
                statusTitle: 'Live Branch Status',
                accessCustomer: 'Customer Login', accessCustomerLogout: 'Customer Logout',
                accessAdmin: 'Admin Login', accessAdminPanel: 'Dashboard',
                navHome: 'Home', navServices: 'Services', navAbout: 'About', navContact: 'Contact',
                serviceTicket: 'Digital Ticket', serviceLoan: 'Micro-Loan Pre-Screening',
                serviceBranch: 'Live Branch', serviceTrack: 'Track Your Service',
                optionCash: 'Cash Deposit / Withdrawal', optionLoan: 'Micro Loan Inquiry', optionAccount: 'Account Opening',
                optionGroundnut: 'Groundnut Harvest Stock', optionLivestock: 'Livestock / Cattle Stock', optionIrrigation: 'Irrigation Equipment',
                namePlaceholder: 'e.g. Ahmed Ali', phonePlaceholder: '0911......',
                labelEstLoan: 'Est. Loan Amount:', labelBranch: 'Branch:', labelNetwork: 'Network Mode:',
                labelWait: 'Avg Waiting Time:', labelMinutes: 'Minutes', labelCounters: 'Active Counter:',
                trackTitle: 'Track Your Service', labelTicketNumber: 'Ticket number',
                btnCheckTicket: 'Check Ticket', labelLoanId: 'Loan application ID', btnCheckLoan: 'Check Loan',
                queueTitle: 'Live Ticket Viewer', btnRefreshQueue: 'Refresh',
                queueColPosition: 'Position',
                queueColTicket: 'Ticket', queueColService: 'Service', queueColStatus: 'Status',
                queueLoading: 'Loading tickets...', footerText: 'Oromia Bank Rural Branch Smart Service Portal © 2026 | Babile Branch',
                aboutTitle: 'About Oromia Bank', aboutCopy: 'Oromia Bank S.C. is an Ethiopian financial institution serving individuals, businesses, farmers, and communities. This portal supports customers visiting the Babile Main Branch with digital queue tickets, service tracking, and loan pre-screening.',
                faqTitle: 'Frequently Asked Questions', faqTicketQuestion: 'How do I get a queue ticket?',
                faqTicketAnswer: 'Choose Digital Ticket, enter your name, phone number, and bank account number, select a service, then submit. Keep the ticket number to track your place in the queue.',
                faqLoanQuestion: 'What does the loan pre-screening do?',
                faqLoanAnswer: 'It provides an initial estimate based on the information entered. It is not a loan approval; the branch will review any application.',
                faqContactQuestion: 'Who can read my contact message?',
                faqContactAnswer: 'Contact messages are stored privately and can only be viewed by authorized bank administrators and managers.',
                contactTitle: 'Contact Us', contactBranchNote: 'Send a comment or service question to the branch manager using the form.',
                contactNameLabel: 'Your name', contactDetailsLabel: 'Phone or email (optional)', contactMessageLabel: 'Comment',
                contactSend: 'Send comment', contactSending: 'Sending...', contactSuccess: 'Your comment was sent to the branch manager.', contactError: 'Your comment could not be sent. Please try again.',
                footerAbout: 'About', footerFaq: 'FAQ', footerContact: 'Contact Us',
                inboxTitle: 'Customer comments', inboxIntro: 'Private messages submitted through Contact Us.',
                inboxName: 'Name', inboxContact: 'Contact', inboxMessage: 'Comment', inboxDate: 'Received', inboxStatus: 'Status', inboxAction: 'Action',
                inboxUnread: 'Unread', inboxRead: 'Read', inboxMarkRead: 'Mark read', inboxEmpty: 'No customer comments yet.'
            },
            oro: {
                heroTitle: 'Toora Tajaajila Saffisaa Baankii Oromiyaa - Babile',
                heroSub: 'Tajaajila toraa saffisaa fi xiinxala liqii qonnaa dhabbiilee xixiqqoof',
                qTitle: 'Lakkawwii Toraa Fuudhuuf',
                name: 'Maqaa Guutuu',
                phone: 'Lakk. Bilbilaa',
                accountNumber: 'Lakkoofsa Herrega Baankii',
                service: 'Gosa Tajaajilaa',
                btnQ: 'Tiketti Fudhadhu',
                loanTitle: 'Xiinxala Ulaagaa Liqii',
                collateral: 'Gosa Qabeenya Wabii',
                assetVal: 'Tilmaama Qabeenyaa (ETB)',
                btnL: 'Saffisaan Madaali',
                statusTitle: 'Haala Damee Babile',
                accessCustomer: 'Seensa Maamilaa', accessCustomerLogout: 'Ba\'ii Maamilaa',
                accessAdmin: 'Seensa Bulchaa', accessAdminPanel: 'Dashboard Bulchaa',
                navHome: 'Mana', navServices: 'Tajaajila', navAbout: 'Waa\'ee', navContact: 'Quunnamtii',
                serviceTicket: 'Tikeetii Dijitaalaa', serviceLoan: 'Qorannoo Duraa Liqii',
                serviceBranch: 'Damee Kallattii', serviceTrack: 'Tajaajila Hordofi',
                optionCash: 'Maallaqa Galchuu / Baasuu', optionLoan: 'Gaaffii Liqii Xixiqqaa', optionAccount: 'Herrega Banuu',
                optionGroundnut: 'Oomisha Arachii', optionLivestock: 'Daldala Beeyladaa', optionIrrigation: 'Meeshaa Jallisii',
                namePlaceholder: 'fkn. Ahmed Ali', phonePlaceholder: '0911......',
                labelEstLoan: 'Tilmaama Hanga Liqii:', labelBranch: 'Damee:', labelNetwork: 'Haala Neetworkii:',
                labelWait: 'Yeroo Eegumsaa Giddugaleessaa:', labelMinutes: 'Daqiiqaa', labelCounters: 'Kaawuntara Hojii Irra Jiru:',
                trackTitle: 'Tajaajila Hordofi', labelTicketNumber: 'Lakkoofsa Tikeetii',
                btnCheckTicket: 'Tikeetii Mirkaneessi', labelLoanId: 'ID Iyyannoo Liqii', btnCheckLoan: 'Liqii Mirkaneessi',
                queueTitle: 'Daawataa Tikeetii Kallattii', btnRefreshQueue: 'Haaromsi',
                queueColPosition: 'Tartiiba',
                queueColTicket: 'Tikeetii', queueColService: 'Tajaajila', queueColStatus: 'Haala',
                queueLoading: 'Tikeetii fe' + "'" + 'aa jira...', footerText: 'Baankii Oromiyaa - Tajaajila Damee Baadiyyaa © 2026 | Damee Babile',
                aboutTitle: 'Waa\'ee Baankii Oromiyaa', aboutCopy: 'Baankiin Oromiyaa dhaabbata faayinaansii Itoophiyaa ta\'ee namoota dhuunfaa, dhaabbilee daldalaa, qonnaan bultoota fi hawaasa tajaajila. Poortaalli kun maamiltoota Damee Guddaa Babilee dhufan tikeetii toraa dijitaalaa, hordoffii tajaajilaa fi qorannoo duraa liqii irratti gargaara.',
                faqTitle: 'Gaaffilee Yeroo Baay\'ee Gaafataman', faqTicketQuestion: 'Tikeetii toraa akkamittan argadha?',
                faqTicketAnswer: 'Tikeetii Dijitaalaa filadhu, maqaa, lakkoofsa bilbilaa fi lakkoofsa herrega baankii galchi, tajaajila filadhu, achiis ergi. Lakkoofsa tikeetii kee qabachuun iddoo toraa kee hordofi.',
                faqLoanQuestion: 'Qorannoon duraa liqii maal godha?',
                faqLoanAnswer: 'Odeeffannoo galchite irratti hundaa\'uun tilmaama jalqabaa kenna. Kun raggaasisa liqii miti; dameen iyyannoo kamiyyuu ni sakatta\'a.',
                faqContactQuestion: 'Yaada koo eenyutu dubbisuu danda\'a?',
                faqContactAnswer: 'Ergaawwan quunnamtii dhuunfaatti kuufamu; bulchitootaa fi hooggantoota baankii hayyamaman qofa isaan arguu danda\'u.',
                contactTitle: 'Nu Quunnamaa', contactBranchNote: 'Yaada ykn gaaffii tajaajilaa foormii kanaan hoogganaa dameetti ergi.',
                contactNameLabel: 'Maqaa kee', contactDetailsLabel: 'Bilbila ykn imeelii (dirqama miti)', contactMessageLabel: 'Yaada',
                contactSend: 'Yaada ergi', contactSending: 'Ergaa jira...', contactSuccess: 'Yaadni kee hoogganaa dameetti ergameera.', contactError: 'Yaada kee erguun hin danda\'amne. Maaloo irra deebi\'i.',
                footerAbout: 'Waa\'ee', footerFaq: 'Gaaffilee', footerContact: 'Nu Quunnamaa',
                inboxTitle: 'Yaada Maamiltootaa', inboxIntro: 'Ergaawwan dhuunfaa kutaa Nu Quunnamaa irraa ergaman.',
                inboxName: 'Maqaa', inboxContact: 'Quunnamtii', inboxMessage: 'Yaada', inboxDate: 'Yeroo Ergame', inboxStatus: 'Haala', inboxAction: 'Gocha',
                inboxUnread: 'Hin Dubbifamne', inboxRead: 'Dubbifame', inboxMarkRead: 'Dubbifame jedhii mallatteessi', inboxEmpty: 'Yaadni maamilaa ammaaf hin jiru.'
            },
            am: {
                heroTitle: 'የኦሮሚያ ባንክ የባቢሌ ቅርንጫፍ ስማርት አገልግሎት ፖርታል',
                heroSub: 'የባንክ ሰልፍ ቅነሳ እና የእርሻ/የንግድ ብድር ቅድመ-ምዘና ሥርዓት',
                qTitle: 'የዲጂታል ሰልፍ ትኬት ይውሰዱ',
                name: 'ሙሉ ስም',
                phone: 'ስልክ ቁጥር',
                accountNumber: 'የባንክ ሂሳብ ቁጥር',
                service: 'የአገልግሎት ዓይነት',
                btnQ: 'ትኬት ውሰድ',
                loanTitle: 'የብድር ቅድመ-ምዘና',
                collateral: 'የመያዣ/ዋስትና ዓይነት',
                assetVal: 'የንብረት ግምት (ETB)',
                btnL: 'ብድሩን አስላ',
                statusTitle: 'የቅርንጫፉ ወቅታዊ ሁኔታ',
                accessCustomer: 'የደንበኛ መግቢያ', accessCustomerLogout: 'የደንበኛ መውጫ',
                accessAdmin: 'የአስተዳዳሪ መግቢያ', accessAdminPanel: 'የአስተዳዳሪ ዳሽቦርድ',
                navHome: 'መነሻ', navServices: 'አገልግሎቶች', navAbout: 'ስለ ባንኩ', navContact: 'ያግኙን',
                serviceTicket: 'ዲጂታል ቲኬት', serviceLoan: 'የብድር ቅድመ ምርመራ',
                serviceBranch: 'የቅርንጫፍ ሁኔታ', serviceTrack: 'አገልግሎትን ይከታተሉ',
                optionCash: 'ገንዘብ ማስገባት / ማውጣት', optionLoan: 'የአነስተኛ ብድር ጥያቄ', optionAccount: 'ሂሳብ መክፈት',
                optionGroundnut: 'የኦቾሎኒ ምርት', optionLivestock: 'የእንስሳት ንግድ', optionIrrigation: 'የመስኖ መሣሪያ',
                namePlaceholder: 'ምሳሌ፡ አህመድ አሊ', phonePlaceholder: '0911......',
                labelEstLoan: 'የብድር መጠን ግምት:', labelBranch: 'ቅርንጫፍ:', labelNetwork: 'የኔትወርክ ሁኔታ:',
                labelWait: 'አማካይ የመጠበቂያ ጊዜ:', labelMinutes: 'ደቂቃ', labelCounters: 'ንቁ የአገልግሎት መስኮት:',
                trackTitle: 'አገልግሎትን ይከታተሉ', labelTicketNumber: 'የቲኬት ቁጥር',
                btnCheckTicket: 'ቲኬት ይፈትሹ', labelLoanId: 'የብድር ማመልከቻ መለያ', btnCheckLoan: 'ብድር ይፈትሹ',
                queueTitle: 'የቀጥታ ቲኬት መመልከቻ', btnRefreshQueue: 'አድስ',
                queueColPosition: 'ተራ',
                queueColTicket: 'ቲኬት', queueColService: 'አገልግሎት', queueColStatus: 'ሁኔታ',
                queueLoading: 'ቲኬቶች በመጫን ላይ...', footerText: 'ኦሮሚያ ባንክ - የገጠር ቅርንጫፍ አገልግሎት © 2026 | ባቢሌ',
                aboutTitle: 'ስለ ኦሮሚያ ባንክ', aboutCopy: 'ኦሮሚያ ባንክ አ.ማ. ግለሰቦችን፣ ንግዶችን፣ ገበሬዎችን እና ማህበረሰቦችን የሚያገለግል የኢትዮጵያ የፋይናንስ ተቋም ነው። ይህ ፖርታል የባቢሌ ዋና ቅርንጫፍ ደንበኞችን በዲጂታል ቲኬት፣ በአገልግሎት ክትትል እና በብድር ቅድመ ምርመራ ይረዳል።',
                faqTitle: 'ተደጋጋሚ ጥያቄዎች', faqTicketQuestion: 'የሰልፍ ቲኬት እንዴት አገኛለሁ?',
                faqTicketAnswer: 'ዲጂታል ቲኬትን ይምረጡ፣ ስም፣ ስልክ ቁጥር እና የባንክ ሂሳብ ቁጥር ያስገቡ፣ አገልግሎት ይምረጡና ያስገቡ። በሰልፉ ያለዎትን ቦታ ለመከታተል የቲኬት ቁጥሩን ይያዙ።',
                faqLoanQuestion: 'የብድር ቅድመ ምርመራው ምን ያደርጋል?',
                faqLoanAnswer: 'በገቡት መረጃ ላይ ተመስርቶ የመጀመሪያ ግምት ይሰጣል። ይህ የብድር ማጽደቅ አይደለም፤ ቅርንጫፉ ማመልከቻውን ይገመግማል።',
                faqContactQuestion: 'የእውቂያ መልዕክቴን ማን ሊያነብ ይችላል?',
                faqContactAnswer: 'መልዕክቶቹ በግል ይቀመጣሉ፤ ስልጣን ያላቸው የባንክ አስተዳዳሪዎችና ሥራ አስኪያጆች ብቻ ማየት ይችላሉ።',
                contactTitle: 'ያግኙን', contactBranchNote: 'አስተያየት ወይም የአገልግሎት ጥያቄ በዚህ ቅጽ ለቅርንጫፉ ሥራ አስኪያጅ ይላኩ።',
                contactNameLabel: 'ስምዎ', contactDetailsLabel: 'ስልክ ወይም ኢሜይል (አማራጭ)', contactMessageLabel: 'አስተያየት',
                contactSend: 'አስተያየት ይላኩ', contactSending: 'በመላክ ላይ...', contactSuccess: 'አስተያየትዎ ለቅርንጫፉ ሥራ አስኪያጅ ተልኳል።', contactError: 'አስተያየትዎን መላክ አልተቻለም። እባክዎ ይድገሙ።',
                footerAbout: 'ስለ ባንኩ', footerFaq: 'ጥያቄዎች', footerContact: 'ያግኙን',
                inboxTitle: 'የደንበኞች አስተያየቶች', inboxIntro: 'ከያግኙን የተላኩ የግል መልዕክቶች።',
                inboxName: 'ስም', inboxContact: 'እውቂያ', inboxMessage: 'አስተያየት', inboxDate: 'የተቀበለበት', inboxStatus: 'ሁኔታ', inboxAction: 'እርምጃ',
                inboxUnread: 'ያልተነበበ', inboxRead: 'ተነቧል', inboxMarkRead: 'እንደተነበበ ምልክት ያድርጉ', inboxEmpty: 'እስካሁን የደንበኛ አስተያየት የለም።'
            }
        };

        function setLang(lang) {
            const languageKey = i18n[lang] ? lang : 'en';
            document.querySelectorAll('#languageSwitcher button').forEach((button) => {
                button.classList.toggle('active', button.dataset.lang === languageKey);
            });

            const t = i18n[languageKey];
            document.documentElement.lang = languageKey;
            try {
                localStorage.setItem('oromia_portal_language', languageKey);
            } catch (error) { }
            document.getElementById('txt-hero-title').innerText = t.heroTitle;
            document.getElementById('txt-hero-sub').innerText = t.heroSub;
            document.getElementById('txt-q-title').innerText = t.qTitle;
            document.getElementById('lbl-name').innerText = t.name;
            document.getElementById('lbl-applicant').innerText = t.name;
            document.getElementById('lbl-phone').innerText = t.phone;
            document.getElementById('lbl-account-number').innerText = t.accountNumber;
            document.getElementById('lbl-service').innerText = t.service;
            document.getElementById('btn-q-submit').innerText = t.btnQ;
            document.getElementById('txt-loan-title').innerText = t.loanTitle;
            document.getElementById('lbl-loan-type').innerText = t.collateral;
            document.getElementById('lbl-asset-val').innerText = t.assetVal;
            document.getElementById('btn-l-submit').innerText = t.btnL;
            document.getElementById('txt-status-title').innerText = t.statusTitle;
            document.getElementById('service-ticket').innerText = t.serviceTicket;
            document.getElementById('service-loan').innerText = t.serviceLoan;
            document.getElementById('service-branch').innerText = t.serviceBranch;
            document.getElementById('service-track').innerText = t.serviceTrack;
            document.getElementById('service-nav-ticket').innerText = t.serviceTicket;
            document.getElementById('service-nav-loan').innerText = t.serviceLoan;
            document.getElementById('service-nav-branch').innerText = t.serviceBranch;
            document.getElementById('service-nav-track').innerText = t.serviceTrack;
            document.getElementById('option-cash').innerText = t.optionCash;
            document.getElementById('option-loan').innerText = t.optionLoan;
            document.getElementById('option-account').innerText = t.optionAccount;
            document.getElementById('option-groundnut').innerText = t.optionGroundnut;
            document.getElementById('option-livestock').innerText = t.optionLivestock;
            document.getElementById('option-irrigation').innerText = t.optionIrrigation;
            document.getElementById('q-name').placeholder = t.namePlaceholder;
            document.getElementById('label-est-loan').innerText = t.labelEstLoan;
            document.getElementById('label-branch').innerText = t.labelBranch;
            document.getElementById('label-network').innerText = t.labelNetwork;
            document.getElementById('label-wait').innerText = t.labelWait;
            document.getElementById('label-minutes').innerText = t.labelMinutes;
            document.getElementById('label-counters').innerText = t.labelCounters;
            document.getElementById('track-title').innerText = t.trackTitle;
            document.getElementById('label-ticket-number').innerText = t.labelTicketNumber;
            document.getElementById('btn-check-ticket').innerText = t.btnCheckTicket;
            document.getElementById('label-loan-id').innerText = t.labelLoanId;
            document.getElementById('btn-check-loan').innerText = t.btnCheckLoan;
            document.getElementById('liveQueueTitle').innerText = t.queueTitle;
            document.getElementById('btn-refresh-queue').innerText = t.btnRefreshQueue;
            document.getElementById('btn-refresh-queue').setAttribute('aria-label', t.btnRefreshQueue);
            document.getElementById('queue-col-ticket').innerText = t.queueColTicket;
            document.getElementById('queue-col-position').innerText = t.queueColPosition;
            document.getElementById('queue-col-service').innerText = t.queueColService;
            document.getElementById('queue-col-status').innerText = t.queueColStatus;
            const loadingRow = document.querySelector('#liveQueueBody .live-empty');
            if (loadingRow) loadingRow.innerText = t.queueLoading;
            document.getElementById('footerCopyright').innerText = t.footerText;
            document.getElementById('footerAboutLink').innerText = t.footerAbout;
            document.getElementById('footerFaqLink').innerText = t.footerFaq;
            document.getElementById('footerContactLink').innerText = t.footerContact;
            document.getElementById('aboutTitle').innerText = t.aboutTitle;
            document.getElementById('aboutCopy').innerText = t.aboutCopy;
            document.getElementById('faqTitle').innerText = t.faqTitle;
            document.getElementById('faqTicketQuestion').innerText = t.faqTicketQuestion;
            document.getElementById('faqTicketAnswer').innerText = t.faqTicketAnswer;
            document.getElementById('faqLoanQuestion').innerText = t.faqLoanQuestion;
            document.getElementById('faqLoanAnswer').innerText = t.faqLoanAnswer;
            document.getElementById('faqContactQuestion').innerText = t.faqContactQuestion;
            document.getElementById('faqContactAnswer').innerText = t.faqContactAnswer;
            document.getElementById('contactTitle').innerText = t.contactTitle;
            document.getElementById('contactBranchNote').innerText = t.contactBranchNote;
            document.getElementById('contactNameLabel').innerText = t.contactNameLabel;
            document.getElementById('contactDetailsLabel').innerText = t.contactDetailsLabel;
            document.getElementById('contactMessageLabel').innerText = t.contactMessageLabel;
            document.getElementById('contactSubmit').innerText = t.contactSend;
            document.getElementById('contactInboxTitle').innerText = t.inboxTitle;
            document.getElementById('contactInboxIntro').innerText = t.inboxIntro;
            document.getElementById('refreshContactMessages').innerText = t.btnRefreshQueue;
            document.getElementById('inboxNameHeading').innerText = t.inboxName;
            document.getElementById('inboxContactHeading').innerText = t.inboxContact;
            document.getElementById('inboxMessageHeading').innerText = t.inboxMessage;
            document.getElementById('inboxDateHeading').innerText = t.inboxDate;
            document.getElementById('inboxStatusHeading').innerText = t.inboxStatus;
            document.getElementById('inboxActionHeading').innerText = t.inboxAction;
            document.getElementById('nav-home').innerText = t.navHome;
            document.getElementById('nav-services').innerText = t.navServices;
            document.getElementById('nav-about').innerText = t.navAbout;
            document.getElementById('nav-contact').innerText = t.navContact;
            updateAdminButton();
            updateCustomerButton();
            renderContactMessages();
        }

        function openAuthModal() {
            const modal = document.getElementById('authModal');
            modal.classList.add('open');
        }

        function closeAuthModal() {
            const modal = document.getElementById('authModal');
            modal.classList.remove('open');
            document.getElementById('authMessage').textContent = '';
        }

        function updateAdminButton() {
            const adminToggleBtn = document.getElementById('adminToggleBtn');
            const t = i18n[document.documentElement.lang] || i18n.en;
            if (!authState.token) {
                adminToggleBtn.textContent = t.accessAdmin;
                return;
            }
            adminToggleBtn.textContent = authState.role ? `${authState.role.charAt(0).toUpperCase() + authState.role.slice(1)} ${t.accessAdminPanel}` : t.accessAdminPanel;
        }

        function setSession(token, username, role) {
            authState.token = token;
            authState.username = username;
            authState.role = role || authState.role || 'admin';
            localStorage.setItem('oromia_admin_token', token || '');
            localStorage.setItem('oromia_admin_username', username || '');
            localStorage.setItem('oromia_admin_role', authState.role || '');
            updateAdminButton();
            updateRoleUI();
        }

        function clearSession() {
            authState.token = '';
            authState.username = '';
            authState.role = '';
            localStorage.removeItem('oromia_admin_token');
            localStorage.removeItem('oromia_admin_username');
            localStorage.removeItem('oromia_admin_role');
            document.body.classList.remove('admin-mode');
            document.body.classList.add('public-page-mode');
            document.getElementById('adminPanel').classList.add('hidden');
            updateAdminButton();
            updateRoleUI();
        }

        async function fetchJson(url, options = {}) {
            const headers = { ...(options.headers || {}) };
            if (!(options.body instanceof FormData)) {
                headers['Content-Type'] = headers['Content-Type'] || 'application/json';
            }
            if (authState.token) {
                headers.Authorization = `Bearer ${authState.token}`;
            }

            const response = await fetch(url, { ...options, headers });
            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await response.json() : {};

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        }

        async function fetchCustomerJson(url, options = {}) {
            const headers = { ...(options.headers || {}), 'Content-Type': 'application/json' };
            if (customerState.token) headers.Authorization = `Customer ${customerState.token}`;
            const response = await fetch(url, { ...options, headers });
            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await response.json() : {};
            if (!response.ok) {
                const error = new Error(data.message || 'Request failed');
                error.status = response.status;
                throw error;
            }
            return data;
        }

        function updateCustomerButton() {
            const button = document.getElementById('customerToggleBtn');
            const t = i18n[document.documentElement.lang] || i18n.en;
            button.textContent = customerState.token ? t.accessCustomerLogout : t.accessCustomer;
        }

        function setCustomerSession(token, customer) {
            customerState.token = token;
            customerState.fullName = customer.fullName;
            customerState.phone = customer.phone;
            localStorage.setItem('oromia_customer_token', token);
            localStorage.setItem('oromia_customer_name', customer.fullName);
            localStorage.setItem('oromia_customer_phone', customer.phone);
            updateCustomerButton();
        }

        function navigateToService(service) {
            showPublicPage('services');
            selectService(service);
            const dropdown = document.getElementById('servicesNavDropdown');
            dropdown.classList.remove('open');
            document.getElementById('nav-services').setAttribute('aria-expanded', 'false');
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            if (service === 'ticket') {
                document.getElementById('panel-ticket').scrollIntoView({ block: 'start' });
            }
        }

        function clearCustomerSession() {
            customerState.token = '';
            customerState.fullName = '';
            customerState.phone = '';
            localStorage.removeItem('oromia_customer_token');
            localStorage.removeItem('oromia_customer_name');
            localStorage.removeItem('oromia_customer_phone');
            updateCustomerButton();
        }

        function openCustomerAuthModal() {
            document.getElementById('customerAuthModal').classList.add('open');
            document.getElementById('customerAuthMessage').textContent = '';
        }

        function closeCustomerAuthModal() {
            document.getElementById('customerAuthModal').classList.remove('open');
            document.getElementById('customerAuthMessage').textContent = '';
        }

        function toggleCustomerAuthMode() {
            const login = document.getElementById('customerLoginForm');
            const register = document.getElementById('customerRegisterForm');
            const registering = register.style.display === 'none';
            login.style.display = registering ? 'none' : 'block';
            register.style.display = registering ? 'block' : 'none';
            document.getElementById('customerAuthTitle').textContent = registering ? 'Create Customer Account' : 'Customer Login';
            document.getElementById('customerAuthSwitch').textContent = registering ? 'Already have an account? Login' : 'Create a customer account';
            document.getElementById('customerAuthMessage').textContent = '';
        }

        async function handleCustomerLogin(event) {
            event.preventDefault();
            try {
                const data = await fetchCustomerJson(`${API_BASE}/api/customer/login`, {
                    method: 'POST',
                    body: JSON.stringify({
                        phone: document.getElementById('customerLoginPhone').value.trim(),
                        password: document.getElementById('customerLoginPassword').value
                    })
                });
                setCustomerSession(data.token, data.customer);
                closeCustomerAuthModal();
                navigateToService('ticket');
            } catch (error) {
                document.getElementById('customerAuthMessage').textContent = error.message;
            }
        }

        async function handleCustomerRegister(event) {
            event.preventDefault();
            try {
                const data = await fetchCustomerJson(`${API_BASE}/api/customer/register`, {
                    method: 'POST',
                    body: JSON.stringify({
                        fullName: document.getElementById('customerFullName').value.trim(),
                        phone: document.getElementById('customerRegisterPhone').value.trim(),
                        password: document.getElementById('customerRegisterPassword').value
                    })
                });
                setCustomerSession(data.token, data.customer);
                alert('Registration successful! You are now logged in.');
                closeCustomerAuthModal();
                navigateToService('ticket');
            } catch (error) {
                document.getElementById('customerAuthMessage').textContent = error.message;
            }
        }

        async function handleCustomerLogout() {
            try {
                if (customerState.token) await fetchCustomerJson(`${API_BASE}/api/customer/logout`, { method: 'POST' });
            } catch (error) {
                console.error(error);
            } finally {
                clearCustomerSession();
            }
        }

        async function checkExistingCustomerSession() {
            if (!customerState.token) return;
            try {
                const data = await fetchCustomerJson(`${API_BASE}/api/customer/me`);
                setCustomerSession(customerState.token, data.customer);
            } catch (error) {
                clearCustomerSession();
                if (error.status === 401) {
                    openCustomerAuthModal();
                    document.getElementById('customerAuthMessage').textContent = 'Your customer session expired. Please log in again.';
                }
            }
        }

        function requireCustomerLogin() {
            if (customerState.token) return true;
            openCustomerAuthModal();
            return false;
        }

        async function handleLogin(event) {
            event.preventDefault();
            const username = document.getElementById('adminUsername').value.trim();
            const password = document.getElementById('adminPassword').value.trim();
            const messageEl = document.getElementById('authMessage');

            try {
                const data = await fetchJson(`${API_BASE}/api/admin/login`, {
                    method: 'POST',
                    body: JSON.stringify({ username, password })
                });

                setSession(data.token, data.admin.username, data.admin.role);
                closeAuthModal();
                await loadAdminDashboard();
                setAdminView(true);
            } catch (error) {
                messageEl.textContent = error.message;
            }
        }

        async function handleLogout() {
            try {
                if (authState.token) {
                    await fetchJson(`${API_BASE}/api/admin/logout`, { method: 'POST' });
                }
            } catch (error) {
                console.error(error);
            } finally {
                clearSession();
                document.getElementById('adminPanel').classList.add('hidden');
                closeAuthModal();
            }
        }

        async function checkExistingSession() {
            if (!authState.token) return;
            try {
                const data = await fetchJson(`${API_BASE}/api/admin/me`);
                if (data.success && data.admin) {
                    setSession(authState.token, data.admin.username, data.admin.role);
                    await loadAdminDashboard();
                    setAdminView(true);
                }
            } catch (error) {
                clearSession();
            }
        }

        function updateRoleUI() {
            const isManager = authState.role === 'manager' || authState.role === 'admin';
            const isCashier = authState.role === 'cashier' || isManager;

            document.getElementById('exportTicketsBtn').style.display = isManager ? 'inline-block' : 'none';
            document.getElementById('exportLoanBtn').style.display = isManager ? 'inline-block' : 'none';
            document.querySelectorAll('.approval-btn').forEach((button) => {
                button.style.display = isManager ? 'inline-block' : 'none';
            });
            document.getElementById('auditSection').style.display = isManager ? 'block' : 'none';
            document.getElementById('contactMessagesSection').style.display = isManager ? 'block' : 'none';
            if (!isManager) {
                adminState.contactMessages = [];
                document.getElementById('contactMessagesBody').replaceChildren();
            }
            document.getElementById('passwordSection').style.display = authState.token ? 'block' : 'none';
            document.getElementById('branchOpsSection').style.display = isManager ? 'block' : 'none';
            document.querySelectorAll('.admin-nav-button').forEach((button) => {
                const managerOnly = ['auditSection', 'contactMessagesSection', 'branchOpsSection'].includes(button.dataset.adminTarget);
                button.hidden = managerOnly && !isManager;
            });

            const activeButton = document.querySelector('.admin-nav-button.active');
            if (!activeButton || activeButton.hidden) {
                showAdminSection('queueSection');
            }

            if (!isCashier && authState.token) {
                document.getElementById('adminPanel').classList.add('hidden');
            }
        }

        function showAdminSection(sectionId) {
            const targetButton = Array.from(document.querySelectorAll('.admin-nav-button'))
                .find((button) => button.dataset.adminTarget === sectionId && !button.hidden);
            if (!targetButton) return;

            document.querySelectorAll('[data-admin-section]').forEach((section) => {
                section.hidden = section.id !== sectionId;
            });
            document.querySelectorAll('.admin-nav-button').forEach((button) => {
                const isActive = button === targetButton;
                button.classList.toggle('active', isActive);
                if (isActive) {
                    button.setAttribute('aria-current', 'page');
                } else {
                    button.removeAttribute('aria-current');
                }
            });
        }

        function renderAdminDashboard() {
            const queueBody = document.getElementById('adminQueueBody');
            const loanBody = document.getElementById('adminLoanBody');

            queueBody.innerHTML = (adminState.queue || []).map((item) => `
                <tr>
                    <td>${item.position || '—'}</td>
                    <td>${item.name}</td>
                    <td>${item.service}</td>
                    <td><span class="pill ${item.status === 'Waiting' ? 'waiting' : 'served'}">${item.status}</span></td>
                    <td>
                        <button class="small-btn" onclick="updateQueueStatus(${item.id}, 'Served')">Serve</button>
                    </td>
                </tr>
            `).join('');

            loanBody.innerHTML = (adminState.loans || []).map((item) => `
                <tr>
                    <td>${item.name}</td>
                    <td>${Number(item.amount || 0).toLocaleString()} ETB</td>
                    <td><span class="pill ${item.status === 'Approved' ? 'approve' : 'review'}">${item.status}</span></td>
                    <td>
                        <button class="small-btn approval-btn" onclick="updateLoanStatus(${item.id}, 'Approved')">Approve</button>
                    </td>
                </tr>
            `).join('');

            document.getElementById('waitingCount').innerText = (adminState.queue || []).filter((item) => item.status === 'Waiting').length.toString().padStart(2, '0');
            document.getElementById('loanCount').innerText = (adminState.loans || []).length.toString().padStart(2, '0');
            updateRoleUI();
        }

        function renderContactMessages() {
            const body = document.getElementById('contactMessagesBody');
            if (!body) return;
            const t = i18n[document.documentElement.lang] || i18n.en;
            body.replaceChildren();
            if (!adminState.contactMessages.length) {
                const row = body.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 6;
                cell.textContent = t.inboxEmpty;
                return;
            }

            adminState.contactMessages.forEach((message) => {
                const row = body.insertRow();
                row.insertCell().textContent = message.name;
                row.insertCell().textContent = message.contact || '';
                const messageCell = row.insertCell();
                messageCell.className = 'message-cell';
                messageCell.textContent = message.message;
                row.insertCell().textContent = message.created_at;
                row.insertCell().textContent = message.read_at ? t.inboxRead : t.inboxUnread;
                const actionCell = row.insertCell();
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'small-btn';
                button.textContent = message.read_at ? t.inboxRead : t.inboxMarkRead;
                button.disabled = Boolean(message.read_at);
                button.addEventListener('click', () => markContactMessageRead(message.id));
                actionCell.appendChild(button);
            });
        }

        async function loadContactMessages() {
            if (!authState.token || !['admin', 'manager'].includes(authState.role)) return;
            try {
                const data = await fetchJson(`${API_BASE}/api/admin/contact-messages`);
                adminState.contactMessages = data.messages || [];
                renderContactMessages();
            } catch (error) {
                console.error(error);
            }
        }

        async function markContactMessageRead(id) {
            try {
                await fetchJson(`${API_BASE}/api/admin/contact-messages/${id}/read`, { method: 'PATCH' });
                await loadContactMessages();
            } catch (error) {
                alert(error.message);
            }
        }

        async function submitContactMessage(event) {
            event.preventDefault();
            if (contactMessageSending) return;
            contactMessageSending = true;
            const form = event.currentTarget;
            const submitButton = document.getElementById('contactSubmit');
            const status = document.getElementById('contactStatus');
            const t = i18n[document.documentElement.lang] || i18n.en;
            window.clearTimeout(contactStatusTimer);
            contactStatusTimer = 0;
            submitButton.disabled = true;
            submitButton.textContent = t.contactSending;
            status.textContent = '';
            status.classList.remove('error');
            try {
                await fetchJson(`${API_BASE}/api/contact-messages`, {
                    method: 'POST',
                    body: JSON.stringify({
                        name: document.getElementById('contactName').value,
                        contact: document.getElementById('contactDetails').value,
                        message: document.getElementById('contactMessage').value
                    })
                });
                form.reset();
                status.textContent = t.contactSuccess;
                contactStatusTimer = window.setTimeout(() => {
                    status.textContent = '';
                    contactStatusTimer = 0;
                }, 4000);
            } catch (error) {
                status.textContent = t.contactError;
                status.classList.add('error');
            } finally {
                contactMessageSending = false;
                submitButton.disabled = false;
                submitButton.textContent = t.contactSend;
            }
        }

        function renderReports(data) {
            const chart = document.getElementById('dailyTicketChart');
            const dailyTickets = data.dailyTickets || [];
            const maximum = Math.max(...dailyTickets.map((item) => Number(item.total)), 1);
            chart.innerHTML = dailyTickets.length ? dailyTickets.map((item) => `
                <div style="display:grid; grid-template-columns:90px 1fr 40px; gap:10px; align-items:center; margin:8px 0;">
                    <span>${item.day}</span><div class="chart-bar" style="width:${Math.max(4, Number(item.total) / maximum * 100)}%"></div><strong>${item.total}</strong>
                </div>
            `).join('') : '<p>No ticket activity yet.</p>';

            document.getElementById('auditBody').innerHTML = (data.audit || []).map((item) => `
                <tr><td>${item.created_at}</td><td>${item.username}</td><td>${item.action}</td><td>${item.details || ''}</td></tr>
            `).join('');

            const analytics = data.analytics || {};
            const totalTickets = Number(analytics.totalTickets || 0);
            const waitingTickets = Number(analytics.waitingTickets || 0);
            const approvedLoans = Number(analytics.approvedLoanCount || 0);
            const avgWait = Number(analytics.avgWaitMinutes || 0);

            document.getElementById('waitingCount').textContent = String(waitingTickets).padStart(2, '0');
            document.getElementById('loanCount').textContent = String(Number(data.loanCount || 0)).padStart(2, '0');
            document.getElementById('avgWaitDisplay').textContent = `${avgWait} min`;
            document.getElementById('branchStatusDisplay').textContent = analytics.branchStatus || 'Online';
            document.getElementById('analyticsTotalTickets').textContent = totalTickets.toLocaleString();
            document.getElementById('analyticsWaitingTickets').textContent = waitingTickets.toLocaleString();
            document.getElementById('analyticsApprovedLoans').textContent = approvedLoans.toLocaleString();

            const serviceBreakdown = analytics.serviceBreakdown || [];
            const serviceMax = Math.max(...serviceBreakdown.map((item) => Number(item.value || 0)), 1);
            document.getElementById('serviceBreakdownChart').innerHTML = serviceBreakdown.length ? serviceBreakdown.map((item) => `
                <div class="service-row">
                    <span>${item.label}</span>
                    <div class="service-bar-track"><div class="service-bar" style="width:${Math.max(10, (Number(item.value || 0) / serviceMax) * 100)}%"></div></div>
                    <strong>${item.value}</strong>
                </div>
            `).join('') : '<p>No service data yet.</p>';

            const trend = analytics.trend || [];
            const trendMax = Math.max(...trend.map((item) => Number(item.total || 0)), 1);
            document.getElementById('analyticsTrendChart').innerHTML = trend.length ? trend.map((item) => `
                <div class="trend-row">
                    <span>${item.day ? item.day.slice(5) : 'N/A'}</span>
                    <div class="service-bar-track"><div class="service-bar alt" style="width:${Math.max(10, (Number(item.total || 0) / trendMax) * 100)}%"></div></div>
                    <strong>${item.total}</strong>
                </div>
            `).join('') : '<p>No ticket history yet.</p>';

            if (data.branch) {
                document.getElementById('branchStatus').value = data.branch.status;
                document.getElementById('branchWait').value = data.branch.avg_wait_minutes;
                document.getElementById('branchCounters').value = data.branch.active_counters;
            }
        }

        async function loadAdminDashboard() {
            if (!authState.token) return;

            try {
                const search = encodeURIComponent(document.getElementById('adminSearch')?.value.trim() || '');
                const status = encodeURIComponent(document.getElementById('adminStatus')?.value || '');
                const data = await fetchJson(`${API_BASE}/api/admin/dashboard?search=${search}&status=${status}`);
                authState.role = data.admin?.role || authState.role;
                localStorage.setItem('oromia_admin_role', authState.role || '');
                adminState.queue = data.queue || [];
                adminState.loans = data.loans || [];
                renderAdminDashboard();
                renderReports(data);
                await loadContactMessages();
            } catch (error) {
                console.error(error);
            }
        }

        async function updateQueueStatus(id, nextStatus) {
            if (!authState.token) return;
            try {
                await fetchJson(`${API_BASE}/api/admin/tickets/${id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: nextStatus })
                });
                await loadAdminDashboard();
            } catch (error) {
                alert(error.message);
            }
        }

        async function updateLoanStatus(id, nextStatus) {
            if (!authState.token) return;
            try {
                await fetchJson(`${API_BASE}/api/admin/loans/${id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: nextStatus })
                });
                await loadAdminDashboard();
            } catch (error) {
                alert(error.message);
            }
        }

        async function exportAdminData(type) {
            if (!authState.token) {
                openAuthModal();
                return;
            }

            if (!(authState.role === 'admin' || authState.role === 'manager')) {
                alert('Only managers can export data.');
                return;
            }

            const endpoint = type === 'tickets'
                ? `${API_BASE}/api/admin/export/tickets`
                : `${API_BASE}/api/admin/export/loan-approvals`;

            try {
                const response = await fetch(endpoint, {
                    headers: { Authorization: `Bearer ${authState.token}` }
                });

                if (!response.ok) {
                    throw new Error((await response.json()).message || 'Export failed');
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = type === 'tickets' ? 'oromia-ticket-export.csv' : 'oromia-loan-approvals.csv';
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            } catch (error) {
                alert(error.message);
            }
        }

        async function lookupTicket() {
            if (!requireCustomerLogin()) return;
            const ticket = document.getElementById('ticketLookup').value.trim();
            if (!ticket) return;
            try {
                const data = await fetchCustomerJson(`${API_BASE}/api/tickets/lookup?ticket=${encodeURIComponent(ticket)}`);
                activeTicketNumber = data.ticket.ticket_number;
                document.getElementById('lookupResult').textContent = ticketStatusSummary(data.ticket);
                showTicketPosition(data.ticket);
            } catch (error) {
                document.getElementById('lookupResult').textContent = error.message;
            }
        }

        function ticketStatusSummary(ticket) {
            if (ticket.status !== 'WAITING') return `Ticket ${ticket.ticket_number}: ${ticket.status} - ${ticket.service_type}`;
            const ahead = Number(ticket.customers_ahead || 0);
            const countText = `${ahead} ${ahead === 1 ? 'customer' : 'customers'} ahead`;
            return `Ticket ${ticket.ticket_number}: ${ticket.status} - ${ticket.service_type} - ${countText}`;
        }

        function showTicketPosition(ticket) {
            const position = document.getElementById('res-queue-position');
            if (!position || ticket.ticket_number !== activeTicketNumber) return;
            if (ticket.status !== 'WAITING') {
                position.textContent = `Ticket status: ${ticket.status}`;
                return;
            }
            const ahead = Number(ticket.customers_ahead || 0);
            position.textContent = `${ahead} ${ahead === 1 ? 'customer' : 'customers'} ahead of you`;
        }

        async function refreshTicketPosition() {
            if (!customerState.token || !activeTicketNumber) return;
            try {
                const data = await fetchCustomerJson(`${API_BASE}/api/tickets/lookup?ticket=${encodeURIComponent(activeTicketNumber)}`);
                showTicketPosition(data.ticket);
            } catch (error) {
                if (error.status === 404) {
                    activeTicketNumber = '';
                    document.getElementById('res-queue-position').textContent = 'This ticket is no longer active.';
                    return;
                }
                console.error(error);
            }
        }

        async function lookupLoan() {
            if (!requireCustomerLogin()) return;
            const id = document.getElementById('loanLookup').value.trim();
            if (!id) return;
            try {
                const data = await fetchCustomerJson(`${API_BASE}/api/loans/lookup?id=${encodeURIComponent(id)}`);
                document.getElementById('lookupResult').textContent = `Loan ${data.loan.id}: ${data.loan.status} - estimated ${Number(data.loan.estimated_loan).toLocaleString()} ETB`;
            } catch (error) {
                document.getElementById('lookupResult').textContent = error.message;
            }
        }

        async function saveBranchSettings() {
            try {
                await fetchJson(`${API_BASE}/api/admin/branch`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: document.getElementById('branchStatus').value,
                        avgWaitMinutes: Number(document.getElementById('branchWait').value),
                        activeCounters: document.getElementById('branchCounters').value
                    })
                });
                alert('Branch settings saved.');
            } catch (error) {
                alert(error.message);
            }
        }

        async function changeAdminPassword() {
            try {
                await fetchJson(`${API_BASE}/api/admin/password`, {
                    method: 'POST',
                    body: JSON.stringify({
                        currentPassword: document.getElementById('currentPassword').value,
                        newPassword: document.getElementById('newPassword').value
                    })
                });
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                alert('Password changed successfully.');
            } catch (error) {
                alert(error.message);
            }
        }

        function printDashboard() {
            const panel = document.getElementById('adminPanel');
            panel.classList.remove('hidden');
            window.print();
        }

        async function loadPublicBranchStatus() {
            try {
                const data = await fetchJson(`${API_BASE}/api/branch/status`);
                const branch = data.branch;
                document.getElementById('publicBranchStatus').textContent = branch.status;
                document.getElementById('publicWaitTime').textContent = branch.avg_wait_minutes;
                document.getElementById('publicCounters').textContent = branch.active_counters;
            } catch (error) {
                console.error(error);
            }
        }

        async function loadLiveQueue() {
            const connection = document.getElementById('liveQueueConnection');
            const indicator = document.getElementById('liveQueueIndicator');
            const queueBody = document.getElementById('liveQueueBody');

            try {
                const data = await fetchJson(`${API_BASE}/api/tickets/live`);
                const tickets = data.tickets || [];
                queueBody.replaceChildren();

                if (!tickets.length) {
                    const row = document.createElement('tr');
                    const cell = document.createElement('td');
                    cell.colSpan = 4;
                    cell.className = 'live-empty';
                    cell.textContent = 'No customers are currently waiting.';
                    row.appendChild(cell);
                    queueBody.appendChild(row);
                } else {
                    tickets.forEach((ticket) => {
                        const row = document.createElement('tr');
                        const positionCell = document.createElement('td');
                        const numberCell = document.createElement('td');
                        const serviceCell = document.createElement('td');
                        const statusCell = document.createElement('td');
                        const badge = document.createElement('span');
                        positionCell.textContent = ticket.position;
                        numberCell.textContent = ticket.ticket_number;
                        serviceCell.textContent = ticket.service_type;
                        badge.className = `pill ${ticket.status === 'SERVED' ? 'served' : 'waiting'}`;
                        badge.textContent = ticket.status === 'SERVED' ? 'Served' : 'Waiting';
                        statusCell.appendChild(badge);
                        row.append(positionCell, numberCell, serviceCell, statusCell);
                        queueBody.appendChild(row);
                    });
                }

                connection.textContent = 'Live';
                indicator.classList.remove('offline');
                document.getElementById('liveQueueUpdated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
                refreshTicketPosition();
            } catch (error) {
                connection.textContent = 'Connection lost';
                indicator.classList.add('offline');
                if (!queueBody.children.length) {
                    const row = document.createElement('tr');
                    const cell = document.createElement('td');
                    cell.colSpan = 4;
                    cell.className = 'live-empty';
                    cell.textContent = 'Unable to load tickets. Retrying automatically.';
                    row.appendChild(cell);
                    queueBody.appendChild(row);
                }
                console.error(error);
            }
        }

        function toggleAdminDashboard(forceOpen) {
            const panel = document.getElementById('adminPanel');
            if (!authState.token) {
                openAuthModal();
                return;
            }

            const shouldOpen = typeof forceOpen === 'boolean'
                ? forceOpen
                : panel.classList.contains('hidden');
            setAdminView(shouldOpen);

            if (shouldOpen) {
                loadAdminDashboard();
            }
        }

        function setAdminView(isOpen) {
            document.getElementById('adminPanel').classList.toggle('hidden', !isOpen);
            document.body.classList.toggle('admin-mode', isOpen);
            document.body.classList.toggle('public-page-mode', !isOpen);
            if (isOpen) {
                window.scrollTo(0, 0);
            } else {
                showPublicPage(activePublicPage, false);
            }
        }

        function showPublicPage(pageId, updateHash = true) {
            const targetPage = Array.from(document.querySelectorAll('[data-public-page]'))
                .find((page) => page.dataset.publicPage === pageId);
            if (!targetPage) return;

            activePublicPage = pageId;
            document.body.classList.add('public-page-mode');
            document.body.classList.remove('admin-mode');
            document.querySelectorAll('[data-public-page]').forEach((page) => {
                page.classList.toggle('public-page-active', page === targetPage);
            });
            document.querySelectorAll('.top-nav a[data-public-target]').forEach((link) => {
                const isActive = link.dataset.publicTarget === pageId;
                if (isActive) {
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.removeAttribute('aria-current');
                }
            });

            if (updateHash && window.location.hash !== `#${pageId}`) {
                window.history.pushState(null, '', `#${pageId}`);
            }
            window.scrollTo(0, 0);
        }

        async function issueTicket() {
            if (!requireCustomerLogin()) return;
            const name = document.getElementById('q-name').value.trim();
            const phone = document.getElementById('q-phone').value.trim();
            const accountNumber = document.getElementById('q-account-number').value.trim();
            const service = document.getElementById('q-service').value;

            if (!name || !phone || !accountNumber) {
                alert('Please enter your name, phone number, and bank account number');
                return;
            }

            try {
                const response = await fetchCustomerJson(`${API_BASE}/api/tickets/issue`, {
                    method: 'POST',
                    body: JSON.stringify({ name, phone, accountNumber, serviceType: service })
                });

                document.getElementById('res-num').innerText = response.ticket.ticket_number;
                document.getElementById('ticket-res').style.display = 'block';
                activeTicketNumber = response.ticket.ticket_number;
                await refreshTicketPosition();
                const queueNotice = document.getElementById('res-queue-notice');
                queueNotice.textContent = response.ticket.queue_alert_eligible
                    ? response.ticket.sms_configured
                        ? 'We will text you when you are third in the queue.'
                        : 'The queue is busy, but SMS alerts are not configured yet.'
                    : '';

                if (authState.token) {
                    await loadAdminDashboard();
                }
            } catch (error) {
                if (error.status === 401) {
                    clearCustomerSession();
                    openCustomerAuthModal();
                    document.getElementById('customerAuthMessage').textContent = 'Your customer session expired. Please log in again to request a ticket.';
                    return;
                }
                alert(error.message);
            }
        }

        async function calcLoan() {
            if (!requireCustomerLogin()) return;
            const name = document.getElementById('l-name').value.trim();
            const phone = document.getElementById('q-phone').value.trim();
            const loanType = document.getElementById('l-type').value;
            const assetValue = parseFloat(document.getElementById('l-val').value);

            if (!name || !phone || !assetValue) {
                alert('Please enter applicant name, phone number, and asset value');
                return;
            }

            try {
                const response = await fetchCustomerJson(`${API_BASE}/api/loans/prescreen`, {
                    method: 'POST',
                    body: JSON.stringify({ name, phone, loanType, assetValue })
                });

                const est = Number(response.result.estimated_loan || 0);
                document.getElementById('res-loan-amount').innerText = est.toLocaleString() + ' ETB';
                document.getElementById('loan-res').style.display = 'block';

                if (authState.token) {
                    await loadAdminDashboard();
                }
            } catch (error) {
                alert(error.message);
            }
        }

        document.getElementById('adminToggleBtn').addEventListener('click', () => {
            if (!authState.token) {
                openAuthModal();
            } else {
                toggleAdminDashboard();
            }
        });

        document.getElementById('customerToggleBtn').addEventListener('click', () => {
            if (customerState.token) {
                handleCustomerLogout();
            } else {
                openCustomerAuthModal();
            }
        });

        document.getElementById('loginForm').addEventListener('submit', handleLogin);
        document.getElementById('customerLoginForm').addEventListener('submit', handleCustomerLogin);
        document.getElementById('customerRegisterForm').addEventListener('submit', handleCustomerRegister);
        document.getElementById('contactForm').addEventListener('submit', submitContactMessage);
        document.getElementById('refreshContactMessages').addEventListener('click', loadContactMessages);
        document.querySelectorAll('.admin-nav-button').forEach((button) => {
            button.addEventListener('click', () => showAdminSection(button.dataset.adminTarget));
        });
        document.querySelectorAll('.top-nav a[data-public-target]').forEach((link) => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                showPublicPage(link.dataset.publicTarget);
                if (link.id === 'nav-services') {
                    const dropdown = document.getElementById('servicesNavDropdown');
                    const isOpen = dropdown.classList.toggle('open');
                    link.setAttribute('aria-expanded', String(isOpen));
                }
            });
        });
        document.querySelectorAll('[data-nav-service]').forEach((button) => {
            button.addEventListener('click', () => navigateToService(button.dataset.navService));
        });
        document.addEventListener('click', (event) => {
            const dropdown = document.getElementById('servicesNavDropdown');
            if (!dropdown.contains(event.target)) {
                dropdown.classList.remove('open');
                document.getElementById('nav-services').setAttribute('aria-expanded', 'false');
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const dropdown = document.getElementById('servicesNavDropdown');
                dropdown.classList.remove('open');
                document.getElementById('nav-services').setAttribute('aria-expanded', 'false');
            }
        });
        window.addEventListener('popstate', () => {
            const requestedPage = window.location.hash.slice(1);
            const pageExists = Array.from(document.querySelectorAll('[data-public-page]'))
                .some((page) => page.dataset.publicPage === requestedPage);
            showPublicPage(pageExists ? requestedPage : 'services', false);
        });

        document.querySelectorAll('#languageSwitcher button').forEach((button) => {
            button.addEventListener('click', () => setLang(button.dataset.lang));
        });
        function selectService(service) {
            document.querySelectorAll('.service-choice').forEach((button) => {
                button.classList.toggle('active', button.dataset.service === service);
            });
            document.querySelectorAll('.service-panel').forEach((panel) => {
                panel.classList.toggle('active', panel.id === `panel-${service}`);
            });
        }

        document.querySelectorAll('.service-choice').forEach((button) => {
            button.addEventListener('click', () => selectService(button.dataset.service));
        });

        document.addEventListener('DOMContentLoaded', () => {
            updateAdminButton();
            updateCustomerButton();
            try {
                setLang(localStorage.getItem('oromia_portal_language') || 'en');
            } catch (error) {
                setLang('en');
            }
            updateRoleUI();
            loadPublicBranchStatus();
            loadLiveQueue();
            window.setInterval(loadLiveQueue, 5000);
            checkExistingSession();
            checkExistingCustomerSession();
            renderAdminDashboard();
            selectService('ticket');
            const requestedPage = window.location.hash.slice(1);
            const pageExists = Array.from(document.querySelectorAll('[data-public-page]'))
                .some((page) => page.dataset.publicPage === requestedPage);
            showPublicPage(pageExists ? requestedPage : 'services', false);
        });