import React, { useState, useEffect } from 'react';
import { ApiSettings, ApiProvider } from '../types';

interface SettingsProps {
  onClose: () => void;
  apiSettings: ApiSettings;
  onSaveApiSettings: (settings: ApiSettings) => void;
  customPrompt: string;
  onSavePrompt: (prompt: string) => void;
}

const DEFAULT_COZE_TEMPLATE = `{
  "bot_id": "YOUR_BOT_ID",
  "user": "unique_user_id",
  "query": "{{prompt}}",
  "stream": false
}`;

const DEFAULT_HEADERS = `{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}`;

const Settings: React.FC<SettingsProps> = ({ 
  onClose, 
  apiSettings, 
  onSaveApiSettings,
  customPrompt,
  onSavePrompt
}) => {
  const [prompt, setPrompt] = useState(customPrompt);
  const [localSettings, setLocalSettings] = useState<ApiSettings>(apiSettings);
  const [isSaved, setIsSaved] = useState(false);

  // Sync props to state if they change externally (though usually Settings is a modal)
  useEffect(() => {
    setPrompt(customPrompt);
    setLocalSettings(apiSettings);
  }, [customPrompt, apiSettings]);

  const handleSave = () => {
    onSavePrompt(prompt);
    onSaveApiSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const updateSetting = (key: keyof ApiSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full p-8 overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
            <div className="flex gap-4">
               {isSaved && (
                   <span className="flex items-center text-green-600 text-sm font-medium animate-fade-in">
                       <span className="material-icons text-sm mr-1">check</span> Saved
                   </span>
               )}
               <button onClick={onClose} className="text-slate-500 hover:text-indigo-600">
                   <span className="material-icons">close</span>
               </button>
            </div>
        </div>

        {/* API Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-icons text-indigo-500">api</span>
            <h3 className="text-lg font-semibold text-slate-800">API Provider</h3>
          </div>

          {/* Provider Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg mb-6 w-fit">
            <button
              onClick={() => updateSetting('provider', ApiProvider.GEMINI)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                localSettings.provider === ApiProvider.GEMINI
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Google Gemini (Default)
            </button>
            <button
              onClick={() => updateSetting('provider', ApiProvider.CUSTOM)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                localSettings.provider === ApiProvider.CUSTOM
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Custom HTTP (Coze/OpenAI)
            </button>
          </div>

          {localSettings.provider === ApiProvider.GEMINI ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
               <p className="text-sm text-indigo-800 mb-2 font-medium">Using Built-in Gemini Integration</p>
               <p className="text-xs text-indigo-600">
                  The application uses the `gemini-3-pro-preview` model via the official Google GenAI SDK. 
                  The API key is securely loaded from the environment variables.
               </p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-700 mb-1">API Endpoint URL</label>
                    <input 
                      type="text" 
                      value={localSettings.customUrl}
                      onChange={(e) => updateSetting('customUrl', e.target.value)}
                      placeholder="https://api.coze.cn/open_api/v2/chat"
                      className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Method</label>
                    <select 
                      value={localSettings.customMethod}
                      onChange={(e) => updateSetting('customMethod', e.target.value)}
                      className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Headers (JSON) <span className="text-slate-400 font-normal">- Auth tokens go here</span>
                  </label>
                  <textarea 
                    value={localSettings.customHeaders}
                    onChange={(e) => updateSetting('customHeaders', e.target.value)}
                    placeholder={DEFAULT_HEADERS}
                    rows={4}
                    className="w-full p-2 text-xs bg-slate-900 text-green-400 border border-slate-700 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
               </div>

               <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Body Template <span className="text-slate-400 font-normal">- Use </span>
                    <code className="bg-slate-100 px-1 rounded text-indigo-600">{'{{prompt}}'}</code>
                    <span className="text-slate-400 font-normal"> where the prompt should be injected.</span>
                  </label>
                  <textarea 
                    value={localSettings.customBodyTemplate}
                    onChange={(e) => updateSetting('customBodyTemplate', e.target.value)}
                    placeholder={DEFAULT_COZE_TEMPLATE}
                    rows={6}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
               </div>

               <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Response JSON Path <span className="text-slate-400 font-normal">- Dot notation to extract the text content</span>
                  </label>
                  <input 
                    type="text" 
                    value={localSettings.customResponsePath}
                    onChange={(e) => updateSetting('customResponsePath', e.target.value)}
                    placeholder="messages.0.content"
                    className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Example: For OpenAI, use <code>choices.0.message.content</code>. For Coze, might be <code>messages.0.content</code>.
                  </p>
               </div>
            </div>
          )}
        </div>

        {/* Prompt Engineering */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-icons text-purple-500">psychology</span>
            <h3 className="text-lg font-semibold text-slate-800">Prompt Engineering</h3>
          </div>
          <div className="mb-4">
             <label className="block text-sm font-medium text-slate-700 mb-2">System Instruction Template</label>
             <textarea 
                className="w-full h-32 p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
             />
             <p className="mt-2 text-xs text-slate-400">Customize how the AI translates technical music terms.</p>
          </div>
        </div>

         {/* Save Action */}
         <div className="flex justify-end pt-4 border-t border-slate-200">
             <button 
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
             >
                 <span className="material-icons text-sm">save</span>
                 Save Configuration
             </button>
          </div>

      </div>
    </div>
  );
};

export default Settings;