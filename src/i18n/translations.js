// ============================================================
// ORVAX — Traduções (i18n)
// Estrutura: translations[lang][secao][chave]. Acesso via t('secao.chave').
// Interpolação: t('chave', { nome }) substitui {nome} no texto.
//
// Este arquivo cresce à medida que cada tela é traduzida. O idioma
// atual vem do LanguageContext (useLang). Fallback: pt.
// ============================================================

export const translations = {
  pt: {
    common: {
      continue: 'Continuar',
      tryAgain: 'Tentar Novamente',
      save: 'Salvar',
      cancel: 'Cancelar',
      close: 'Fechar',
      loading: 'Carregando…',
      back: 'Voltar',
      confirm: 'Confirmar',
    },
    lang: {
      toggle: 'EN',       // rótulo do botão quando está em PT (leva pra EN)
      current: 'PT',
    },
    login: {
      welcomeTo: 'Bem-vindo ao',
      swipeUp: 'Deslize para cima',
      titleConnect: 'Conecte-se',
      titleForgot: 'Recuperar',
      titleReset: 'Nova Senha',
      titleSignup: 'Criar Conta',
      subConnect: 'e continue sua jornada.',
      subForgot: 'enviaremos um link para seu e-mail.',
      subReset: 'defina uma nova senha de acesso.',
      subSignup: 'inicie sua jornada no ORVAX.',
      emailPlaceholder: 'Endereço de e-mail',
      passwordPlaceholder: 'Senha de acesso',
      newPasswordPlaceholder: 'Nova senha',
      forgotPassword: 'Esqueci minha senha',
      haveAccount: 'Já possuo conta',
      createAccount: 'Criar nova conta?',
      submitConnect: 'Entrar',
      submitForgot: 'Enviar link',
      submitReset: 'Salvar nova senha',
      submitSignup: 'Registrar-se',
      successTitle: 'Sucesso!',
      deniedTitle: 'Acesso Negado',
      successSignup: 'Conta criada! Verifique seu e-mail para confirmar o acesso antes de entrar.',
      successLogin: 'Você foi autenticado com sucesso.',
      deniedMsg: 'Suas credenciais estão incorretas ou o acesso foi recusado pelo sistema.',
      // erros
      errEmailRequired: 'Informe seu e-mail.',
      errResetSent: 'Enviamos um link de redefinição para seu e-mail. Verifique a caixa de entrada e spam.',
      errPasswordShort: 'Senha deve ter 6+ caracteres.',
      errPasswordReset: 'Senha redefinida com sucesso. Faça login.',
      errInvalidCreds: 'E-mail ou senha incorretos.',
      errTooMany: 'Muitas tentativas. Tente novamente em 1 hora.',
      errAlreadyRegistered: 'Este e-mail já está cadastrado. Faça login.',
      errConfirmEmail: 'Confirme seu e-mail antes de entrar.',
      errConnection: 'Erro de conexão.',
    },
  },

  en: {
    common: {
      continue: 'Continue',
      tryAgain: 'Try Again',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      loading: 'Loading…',
      back: 'Back',
      confirm: 'Confirm',
    },
    lang: {
      toggle: 'PT',       // label when in EN (goes to PT)
      current: 'EN',
    },
    login: {
      welcomeTo: 'Welcome to',
      swipeUp: 'Swipe up',
      titleConnect: 'Sign in',
      titleForgot: 'Recover',
      titleReset: 'New Password',
      titleSignup: 'Create Account',
      subConnect: 'and continue your journey.',
      subForgot: "we'll send a link to your email.",
      subReset: 'set a new access password.',
      subSignup: 'start your journey on ORVAX.',
      emailPlaceholder: 'Email address',
      passwordPlaceholder: 'Access password',
      newPasswordPlaceholder: 'New password',
      forgotPassword: 'Forgot my password',
      haveAccount: 'I already have an account',
      createAccount: 'Create new account?',
      submitConnect: 'Sign in',
      submitForgot: 'Send link',
      submitReset: 'Save new password',
      submitSignup: 'Sign up',
      successTitle: 'Success!',
      deniedTitle: 'Access Denied',
      successSignup: 'Account created! Check your email to confirm access before signing in.',
      successLogin: 'You have been authenticated successfully.',
      deniedMsg: 'Your credentials are incorrect or access was denied by the system.',
      // errors
      errEmailRequired: 'Enter your email.',
      errResetSent: 'We sent a reset link to your email. Check your inbox and spam folder.',
      errPasswordShort: 'Password must be 6+ characters.',
      errPasswordReset: 'Password reset successfully. Please sign in.',
      errInvalidCreds: 'Incorrect email or password.',
      errTooMany: 'Too many attempts. Try again in 1 hour.',
      errAlreadyRegistered: 'This email is already registered. Please sign in.',
      errConfirmEmail: 'Confirm your email before signing in.',
      errConnection: 'Connection error.',
    },
  },
};
