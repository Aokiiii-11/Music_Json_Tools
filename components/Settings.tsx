import React, { useState, useEffect } from 'react';
import { ApiSettings, ApiProvider } from '../types';

interface SettingsProps {
  onClose: () => void;
  apiSettings: ApiSettings;
  onSaveApiSettings: (settings: ApiSettings) => void;
  customPrompt: string;
  onSavePrompt: (prompt: string) => void;
}

const PRESETS = {
  COZE_V2: {
    url: 'https://api.coze.cn/open_api/v2/chat',
    method: 'POST',
    headers: '{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer YOUR_PAT_TOKEN"\n}',
    body: '{\n  "bot_id": "YOUR_BOT_ID",\n  "user": "user_123456",\n  "query": {{prompt}},\n  "stream": false\n}',
    path: 'messages.0.content'
  },
  OPENAI: {
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    headers: '{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer YOUR_SK_KEY"\n}',
    body: '{\n  "model": "gpt-3.5-turbo",\n  "messages": [\n    { "role": "user", "content": {{prompt}} }\n  ]\n}',
    path: 'choices.0.message.content'
  }
};

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
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Sync props to state if they change externally
  useEffect(() => {
    setPrompt(customPrompt);
    setLocalSettings(apiSettings);
    validateJsonField('customHeaders', apiSettings.customHeaders);
    validateJsonField('customBodyTemplate', apiSettings.customBodyTemplate);
  }, [customPrompt, apiSettings]);

  const validateJsonField = (key: string, value: string) => {
    if (!value.trim()) {
        if (key === 'customBodyTemplate') {
             setErrors(prev => ({ ...prev, [key]: 'Body template cannot be empty' }));
        } else {
             setErrors(prev => { const n = {...prev}; delete n[key]; return n; });
        }
        return;
    }
    try {
        // For body template, we need to temporarily replace {{prompt}} to validate JSON syntax
        const textToTest = key === 'customBodyTemplate' 
            ? value.replace('{{prompt}}', '"TEST"') 
            : value;
        JSON.parse(textToTest);
        setErrors(prev => { const n = {...prev}; delete n[key]; return n; });
    } catch (e) {
        setErrors(prev => ({ ...prev, [key]: 'Invalid JSON format' }));
    }
  };

  const handleSave = () => {
    // Final validation check
    const headerValid = !errors.customHeaders;
    const bodyValid = !errors.customBodyTemplate;
    
    if (localSettings.provider === ApiProvider.CUSTOM && (!headerValid || !bodyValid)) {
        alert("Please fix JSON errors in Custom API settings before saving.");
        return;
    }

    onSavePrompt(prompt);
    onSaveApiSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const updateSetting = (key: keyof ApiSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'customHeaders' || key === 'customBodyTemplate') {
        validateJsonField(key, value);
    }
  };

  const applyPreset = (type: 'COZE_V2' | 'OPENAI') => {
    const preset = PRESETS[type];
    const newSettings = {
      ...localSettings,
      provider: ApiProvider.CUSTOM,
      customUrl: preset.url,
      customMethod: preset.method as 'POST',
      customHeaders: preset.headers,
      customBodyTemplate: preset.body,
      customResponsePath: preset.path
    };
    setLocalSettings(newSettings);
    // Re-validate
    validateJsonField('customHeaders', preset.headers);
    validateJsonField('customBodyTemplate', preset.body);
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <span className="material-icons text-indigo-500">api</span>
                <h3 className="text-lg font-semibold text-slate-800">API Provider</h3>
            </div>
            
            {/* Provider Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                onClick={() => updateSetting('provider', ApiProvider.GEMINI)}
                className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                    localSettings.provider === ApiProvider.GEMINI
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                >
                Gemini (Built-in)
                </button>
                <button
                onClick={() => updateSetting('provider', ApiProvider.CUSTOM)}
                className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                    localSettings.provider === ApiProvider.CUSTOM
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                >
                Custom HTTP
                </button>
            </div>
          </div>

          {localSettings.provider === ApiProvider.GEMINI ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
               <div className="flex items-start gap-3">
                  <span className="material-icons text-indigo-600 mt-0.5">info</span>
                  <div>
                    <p className="text-sm text-indigo-900 font-bold mb-1">Using Google Gemini (Official)</p>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                        The application uses the <code>gemini-3-pro-preview</code> model via the official Google GenAI SDK. 
                        The API key is securely loaded from your environment variables. No further configuration is needed.
                    </p>
                  </div>
               </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
               
               {/* Presets */}
               <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Quick Presets:</span>
                  <button 
                    onClick={() => applyPreset('COZE_V2')}
                    className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs rounded border border-slate-200 transition-colors"
                  >
                    Load Coze V2 Config
                  </button>
                  <button 
                    onClick={() => applyPreset('OPENAI')}
                    className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs rounded border border-slate-200 transition-colors"
                  >
                    Load OpenAI Config
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">API Endpoint URL</label>
                    <input 
                      type="text" 
                      value={localSettings.customUrl}
                      onChange={(e) => updateSetting('customUrl', e.target.value)}
                      placeholder="https://api.coze.cn/open_api/v2/chat"
                      className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Method</label>
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
                  <div className="flex justify-between items-end mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Headers <span className="text-slate-400 font-normal lowercase">(JSON format)</span>
                      </label>
                      {errors.customHeaders && (
                          <span className="text-xs text-red-500 font-medium">{errors.customHeaders}</span>
                      )}
                  </div>
                  <textarea 
                    value={localSettings.customHeaders}
                    onChange={(e) => updateSetting('customHeaders', e.target.value)}
                    placeholder='{ "Content-Type": "application/json", "Authorization": "Bearer ..." }'
                    rows={3}
                    className={`w-full p-2 text-xs bg-slate-900 text-green-400 border rounded outline-none font-mono transition-colors ${
                        errors.customHeaders 
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' 
                        : 'border-slate-700 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
               </div>

               <div>
                  <div className="flex justify-between items-end mb-1">
                     <label className="block text-xs font-bold text-slate-700 uppercase">
                        Body Template
                     </label>
                     {errors.customBodyTemplate && (
                          <span className="text-xs text-red-500 font-medium">{errors.customBodyTemplate}</span>
                      )}
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2 bg-slate-100 p-2 rounded">
                    Use <code className="text-indigo-600 font-bold">{'{{prompt}}'}</code> as a placeholder. 
                    The app will automatically insert the translation task there (properly escaped).
                    <br/>
                    Example: <code>"query": {'{{prompt}}'}</code>
                  </div>
                  <textarea 
                    value={localSettings.customBodyTemplate}
                    onChange={(e) => updateSetting('customBodyTemplate', e.target.value)}
                    placeholder='{ "messages": [{"role": "user", "content": {{prompt}} }] }'
                    rows={6}
                    className={`w-full p-2 text-xs bg-slate-50 border rounded outline-none font-mono transition-colors ${
                        errors.customBodyTemplate 
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' 
                        : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
               </div>

               <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Response JSON Path
                  </label>
                  <input 
                    type="text" 
                    value={localSettings.customResponsePath}
                    onChange={(e) => updateSetting('customResponsePath', e.target.value)}
                    placeholder="messages.0.content"
                    className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Dot notation to find the text in the response (e.g., <code>choices.0.message.content</code> or <code>messages.0.content</code>)
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
             <p className="mt-2 text-xs text-slate-400">Customize the persona and rules for the translation engine.</p>
          </div>
        </div>

         {/* Save Action */}
         <div className="flex justify-end pt-4 border-t border-slate-200">
             <button 
                onClick={handleSave}
                disabled={localSettings.provider === ApiProvider.CUSTOM && (!!errors.customHeaders || !!errors.customBodyTemplate)}
                className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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