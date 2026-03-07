/**
 * Copyright (c) 2026 Sociedad Comercial Yepsen LTDA. All rights reserved.
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, distribution, or use of this file, via any medium, is strictly prohibited.
 */

// Legal Service for handling terms and privacy policy content
const legalService = {
    // Terms and Conditions content in Spanish
    termsContent: 'Al registrarse y utilizar PzKayak Connect, acepta someterse a estos Términos, administrados por Sociedad Comercial Yepsen LTDA. La aplicación proporciona herramientas de seguimiento GPS y un botón SOS. Usted comprende que es una herramienta complementaria y no reemplaza a los servicios de rescate oficiales. Sociedad Comercial Yepsen LTDA implementa medidas de seguridad razonables, pero no garantiza la seguridad absoluta de los datos. El usuario acepta que Sociedad Comercial Yepsen LTDA no será responsable por la pérdida, robo o exposición de datos personales o ubicaciones como resultado de ataques cibernéticos, hackeos o vulneraciones de seguridad de terceros.',
    
    // Privacy Policy content in Spanish
    privacyContent: 'Recopilamos datos de ubicación (coordenadas GPS en primer y segundo plano), contenido de usuario (fotografías y pines de capturas) y datos de contacto de emergencia. Estos datos se usan estrictamente para proveer los servicios de la aplicación y no se venden a terceros. Al aceptar esta política, el usuario comprende y asume el riesgo inherente de que sus datos puedan ser objeto de accesos no autorizados mediante técnicas de hackeo, eximiendo a la empresa de responsabilidad ante dichas vulneraciones maliciosas.',
    
    // Get terms content
    getTermsContent() {
        return this.termsContent;
    },
    
    // Get privacy policy content
    getPrivacyContent() {
        return this.privacyContent;
    },
    
    // Show terms modal
    showTermsModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-bold" data-i18n="auth.termsModalTitle">Términos y Condiciones</h3>
                        <button onclick="legalService.closeModal(this)" class="text-gray-500 hover:text-gray-700">
                            <i class="fa fa-times text-xl"></i>
                        </button>
                    </div>
                    <div class="text-gray-700 space-y-4">
                        <p>${this.getTermsContent()}</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        // Update i18n content
        if (window.i18next) {
            modal.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = window.i18next.t(key);
            });
        }
    },
    
    // Show privacy policy modal
    showPrivacyModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-bold" data-i18n="auth.privacyModalTitle">Política de Privacidad</h3>
                        <button onclick="legalService.closeModal(this)" class="text-gray-500 hover:text-gray-700">
                            <i class="fa fa-times text-xl"></i>
                        </button>
                    </div>
                    <div class="text-gray-700 space-y-4">
                        <p>${this.getPrivacyContent()}</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        // Update i18n content
        if (window.i18next) {
            modal.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = window.i18next.t(key);
            });
        }
    },
    
    // Close modal
    closeModal(button) {
        const modal = button.closest('.fixed');
        if (modal) {
            modal.remove();
        }
    }
};

// Export the legal service
window.legalService = legalService;