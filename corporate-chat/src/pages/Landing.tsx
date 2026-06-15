import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Users, Shield, Zap, CheckCircle, ArrowRight } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MessageCircle className="text-blue-600" size={32} />
              <span className="text-2xl font-bold text-gray-900">CorporateChat</span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition"
              >
                Войти
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Регистрация
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Корпоративный чат для вашей команды
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Общайтесь эффективно, работайте продуктивно. Безопасная платформа для командной коммуникации.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-lg font-semibold flex items-center space-x-2"
            >
              <span>Начать бесплатно</span>
              <ArrowRight size={20} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition text-lg font-semibold"
            >
              Демо версия
            </button>
          </div>
        </div>

        {/* Screenshot mockup */}
        <div className="mt-16 relative">
          <div className="bg-white rounded-xl shadow-2xl p-4 border border-gray-200">
            <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-200 rounded-lg flex items-center justify-center">
              <MessageCircle size={120} className="text-blue-600 opacity-50" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Почему выбирают CorporateChat?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="text-blue-600" size={40} />}
              title="Мгновенная связь"
              description="Обменивайтесь сообщениями в реальном времени с коллегами и командами"
            />
            <FeatureCard
              icon={<Shield className="text-blue-600" size={40} />}
              title="Безопасность данных"
              description="Шифрование end-to-end и полная конфиденциальность переписки"
            />
            <FeatureCard
              icon={<Users className="text-blue-600" size={40} />}
              title="Командная работа"
              description="Создавайте группы, делитесь файлами и организуйте видеозвонки"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Все необходимое для эффективной коммуникации
              </h2>
              <div className="space-y-4">
                <BenefitItem text="Неограниченная история сообщений" />
                <BenefitItem text="Отправка файлов и документов" />
                <BenefitItem text="Голосовые и видео звонки" />
                <BenefitItem text="Интеграция с популярными сервисами" />
                <BenefitItem text="Мобильные приложения для iOS и Android" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-xl p-8">
              <div className="space-y-4">
                <div className="h-16 bg-blue-100 rounded-lg"></div>
                <div className="h-12 bg-gray-100 rounded-lg w-3/4"></div>
                <div className="h-12 bg-blue-100 rounded-lg w-2/3 ml-auto"></div>
                <div className="h-16 bg-gray-100 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Готовы начать?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Присоединяйтесь к тысячам компаний, использующих CorporateChat
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition text-lg font-semibold"
          >
            Создать аккаунт
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2026 CorporateChat. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description
}) => (
  <div className="text-center p-6">
    <div className="flex justify-center mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const BenefitItem: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center space-x-3">
    <CheckCircle className="text-green-500 flex-shrink-0" size={24} />
    <span className="text-gray-700">{text}</span>
  </div>
);

export default Landing;