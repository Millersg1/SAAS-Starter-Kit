import Layout from './Layout';

const ComingSoon = ({ title, phase, description }) => {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-6xl mb-4">🚧</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600 mb-6">{description}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Coming in {phase}</span>
              <br />
              This feature is currently under development
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ComingSoon;
