import React, { useState, useEffect } from 'react';
import {
  WebsiteTemplate,
  DemoSiteDetails,
  DemoSiteBrand,
} from '../../types/index.ts';
import {
  getWebsiteTemplates,
  updateWebsiteTemplateMetadata,
  duplicateWebsiteTemplate,
  archiveWebsiteTemplate,
} from '../../data/repo.ts';
import {
  renderWebsiteTemplate,
  validateTemplateHtml,
} from '../../lib/templateEngine.ts';
import {
  Plus,
  Search,
  Eye,
  Copy,
  Edit2,
  Trash2,
  Layout,
  Smartphone,
  Tablet,
  Monitor,
  AlertCircle,
  CheckCircle2,
  X,
  Code,
  Tag,
  Sparkles,
  Info,
} from 'lucide-react';

const DUMMY_DETAILS: DemoSiteDetails = {
  businessName: 'Fitzwilliam Clinic',
  tagline: 'Specialist medical and dental care in central Dublin',
  about: 'Providing personalized, evidence-based healthcare with modern facilities and dedicated clinicians.',
  services: [
    { title: 'Comprehensive Consultation', text: 'Detailed diagnostic assessment and tailored treatment planning.' },
    { title: 'Preventive Care', text: 'Routine screening, health monitoring, and personalized hygiene advice.' },
    { title: 'Specialist Treatments', text: 'Advanced clinical procedures delivered by accredited medical specialists.' },
  ],
  phone: '+353 1 234 5678',
  email: 'appointments@fitzwilliamclinic.ie',
  address: '22 Fitzwilliam Square, Dublin 2, Ireland',
  openingHours: 'Mon - Fri: 08:30 - 18:00',
  ctaText: 'Book an Appointment',
  ctaLink: 'https://fitzwilliamclinic.ie/booking',
};

const DUMMY_BRAND: DemoSiteBrand = {
  primaryColor: '#D92D50',
  secondaryColor: '#101828',
  fontStack: 'system-ui, -apple-system, sans-serif',
};

export const WebsiteTemplatesManager: React.FC = () => {
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<WebsiteTemplate | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Editor Modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WebsiteTemplate | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formHtml, setFormHtml] = useState('');
  const [editorErrors, setEditorErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Guide accordion / modal state
  const [showGuide, setShowGuide] = useState(true);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getWebsiteTemplates();
      setTemplates(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allTags = Array.from(
    new Set(templates.flatMap((t) => t.nicheTags || []).filter(Boolean))
  );

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.nicheTags && t.nicheTags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesTag = selectedTag === 'all' || (t.nicheTags && t.nicheTags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  const handleOpenNew = () => {
    if (templates.filter((t) => !t.archivedAt).length >= 30) {
      showToast('Maximum of 30 templates reached. Please archive an unused template first.');
      return;
    }
    setEditingTemplate(null);
    setFormName('');
    setFormDescription('');
    setFormTags('');
    setFormHtml(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{business_name}}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-body, system-ui, sans-serif); color: #101828; line-height: 1.6; }
    header { padding: 1.5rem 2rem; border-bottom: 1px solid #ECEEF2; display: flex; justify-content: space-between; align-items: center; }
    .hero { padding: 4rem 2rem; text-align: center; max-width: 800px; margin: 0 auto; }
    .hero h1 { font-size: 2.5rem; color: var(--brand-secondary, #101828); margin-bottom: 1rem; }
    .cta-btn { display: inline-block; background: var(--brand-primary, #D92D50); color: var(--brand-primary-contrast, #fff); padding: 0.75rem 1.5rem; border-radius: 9999px; text-decoration: none; font-weight: 600; }
    .services { padding: 3rem 2rem; max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
    .service-box { padding: 1.5rem; background: var(--brand-tint, rgba(217,45,80,0.05)); border-radius: 12px; }
    footer { padding: 2rem; border-top: 1px solid #ECEEF2; text-align: center; font-size: 0.85rem; color: #667085; }
  </style>
</head>
<body>
  <header>
    {{#if logo}}{{logo}}{{/if}}
    <h2>{{business_name}}</h2>
    {{#if phone}}<a href="tel:{{phone}}">{{phone}}</a>{{/if}}
  </header>
  <div class="hero">
    <h1>{{business_name}}</h1>
    {{#if tagline}}<p>{{tagline}}</p>{{/if}}
    {{#if cta_text}}<a href="{{cta_link}}" class="cta-btn">{{cta_text}}</a>{{/if}}
  </div>
  {{#if services}}
  <div class="services">
    {{#services}}
    <div class="service-box">
      <h3>{{title}}</h3>
      <p>{{text}}</p>
    </div>
    {{/services}}
  </div>
  {{/if}}
  <footer>
    <p>&copy; {{year}} {{business_name}}. All rights reserved.</p>
  </footer>
</body>
</html>`);
    setEditorErrors([]);
    setEditorOpen(true);
  };

  const handleOpenEdit = (t: WebsiteTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormDescription(t.description);
    setFormTags((t.nicheTags || []).join(', '));
    setFormHtml(t.html);
    setEditorErrors([]);
    setEditorOpen(true);
  };

  const handleDuplicate = async (t: WebsiteTemplate) => {
    if (templates.filter((x) => !x.archivedAt).length >= 30) {
      showToast('Maximum of 30 templates reached. Cannot duplicate.');
      return;
    }
    try {
      const copy = await duplicateWebsiteTemplate(t.id);
      showToast(`Duplicated as "${copy.name}".`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to duplicate template.');
    }
  };

  const handleArchive = async (t: WebsiteTemplate) => {
    if (!window.confirm(`Are you sure you want to archive "${t.name}"? It will no longer appear in the demo builder.`)) {
      return;
    }
    try {
      await archiveWebsiteTemplate(t.id);
      showToast(`Archived "${t.name}".`);
      if (previewTemplate?.id === t.id) setPreviewTemplate(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive template.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditorErrors([]);

    if (!formName.trim()) {
      setEditorErrors(['Template name is required.']);
      return;
    }

    if (!editingTemplate) {
      setEditorErrors(['Templates must be imported via GitHub Sync.']);
      return;
    }

    setSaving(true);
    try {
      const nicheTags = formTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateWebsiteTemplateMetadata(editingTemplate.id, {
        name: formName,
        description: formDescription,
        nicheTags,
      });

      showToast('Template metadata updated successfully.');
      setEditorOpen(false);
      loadData();
    } catch (err: any) {
      setEditorErrors([err.message || 'Failed to save template.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#101828] text-white px-4 py-3 rounded-[12px] shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-[#12B76A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layout size={18} className="text-[#D92D50]" />
            <h2 className="text-[17px] font-bold text-[#101828]">Website Template Library</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#475467]">
              {templates.length} / 30 active
            </span>
          </div>
          <p className="text-xs text-[#667085] max-w-xl">
            Single-file HTML website templates used to generate instant personalized clinic demos.
            Variables and repeaters are dynamically populated in the Demo Builder.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-black/10 hover:bg-[#F2F4F7] text-[#344054] cursor-pointer transition-colors"
          >
            <Code size={14} />
            <span>{showGuide ? 'Hide Guide' : 'Placeholder Guide'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNew}
            disabled={templates.length >= 30}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
          >
            <Plus size={15} />
            <span>Add Template</span>
          </button>
        </div>
      </div>

      {/* PLACEHOLDER GUIDE CARD */}
      {showGuide && (
        <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#D92D50]" />
              <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                Template Placeholder & Engine Guide
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="text-[#98A2B3] hover:text-[#101828]"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Column 1: Variables */}
            <div className="p-3.5 bg-[#FAFBFD] rounded-xl border border-[#ECEEF2] space-y-2">
              <div className="font-bold text-[#101828] text-[11px] uppercase tracking-wider">
                Direct Placeholders
              </div>
              <p className="text-[11px] text-[#667085]">
                Safely escaped into template HTML:
              </p>
              <div className="space-y-1 font-mono text-[11px] text-[#D92D50]">
                <div>{'{{business_name}}'}</div>
                <div>{'{{tagline}}'}</div>
                <div>{'{{about}}'}</div>
                <div>{'{{logo}}'} <span className="text-[10px] text-[#667085] font-sans">(renders &lt;img&gt;)</span></div>
                <div>{'{{phone}}'}</div>
                <div>{'{{email}}'}</div>
                <div>{'{{address}}'}</div>
                <div>{'{{opening_hours}}'}</div>
                <div>{'{{cta_text}}'}</div>
                <div>{'{{cta_link}}'} <span className="text-[10px] text-[#667085] font-sans">(https/tel/mailto)</span></div>
                <div>{'{{year}}'}</div>
              </div>
            </div>

            {/* Column 2: CSS Vars */}
            <div className="p-3.5 bg-[#FAFBFD] rounded-xl border border-[#ECEEF2] space-y-2">
              <div className="font-bold text-[#101828] text-[11px] uppercase tracking-wider">
                CSS Brand Variables
              </div>
              <p className="text-[11px] text-[#667085]">
                Automatically injected into root styles:
              </p>
              <div className="space-y-1 font-mono text-[11px] text-[#2563EB]">
                <div>--brand-primary</div>
                <div>--brand-secondary</div>
                <div>--brand-primary-contrast</div>
                <div>--brand-tint</div>
                <div>--font-body</div>
              </div>
              <p className="text-[10.5px] text-[#667085] pt-1">
                Use in your CSS: <code>color: var(--brand-primary);</code>
              </p>
            </div>

            {/* Column 3: Blocks & Repeaters */}
            <div className="p-3.5 bg-[#FAFBFD] rounded-xl border border-[#ECEEF2] space-y-2">
              <div className="font-bold text-[#101828] text-[11px] uppercase tracking-wider">
                Repeaters & Conditionals
              </div>
              <p className="text-[11px] text-[#667085]">
                Removes empty sections automatically:
              </p>
              <div className="space-y-1 font-mono text-[11px] text-[#099250]">
                <div>{'{{#if phone}}...{{/if}}'}</div>
                <div>{'{{#services}}'}</div>
                <div className="pl-3">{'{{title}} - {{text}}'}</div>
                <div>{'{{/services}}'}</div>
                <div>{'{{#testimonials}}...{{/testimonials}}'}</div>
                <div>{'{{#images}}...{{/images}}'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="text"
              placeholder="Search templates by name, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-black/10 text-xs text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
            />
          </div>
        </div>

        {/* Niche tag filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedTag('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
              selectedTag === 'all'
                ? 'bg-[#101828] text-white'
                : 'bg-white text-[#667085] border border-black/10 hover:bg-[#F2F4F7]'
            }`}
          >
            All Tags
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                selectedTag === tag
                  ? 'bg-[#101828] text-white'
                  : 'bg-white text-[#667085] border border-black/10 hover:bg-[#F2F4F7]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#667085] bg-white rounded-[24px] border border-black/5">
          Loading website templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-[24px] border border-black/5 p-8">
          <div className="w-12 h-12 rounded-full bg-[#F2F4F7] text-[#667085] flex items-center justify-center mx-auto">
            <Layout size={22} />
          </div>
          <h3 className="text-sm font-bold text-[#101828]">No website templates found</h3>
          <p className="text-xs text-[#667085] max-w-sm mx-auto">
            {templates.length === 0
              ? 'Click "Add Template" to create your first clinic demo website template.'
              : 'No templates match your search or niche tag filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((t) => {
            const isSample = t.isDemo || t.name.startsWith('Sample');
            return (
              <div
                key={t.id}
                className="bg-white rounded-[20px] border border-black/5 shadow-xs overflow-hidden flex flex-col justify-between group hover:border-[#D92D50]/40 transition-all"
              >
                {/* Card Top Preview / Thumbnail Area */}
                <div className="p-4 bg-[#FAFBFD] border-b border-[#ECEEF2] relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#98A2B3]">
                        v{t.version}
                      </span>
                      {t.source ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EEF2F6] text-[#344054] border border-black/5">
                          GitHub: {t.source.path.split('/').pop()} @ {t.source.commitSha.slice(0, 7)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F3F3F5] text-[#667085] border border-black/5">
                          Local (legacy)
                        </span>
                      )}
                    </div>
                    {isSample && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F8EF] text-[#099250] border border-[#A6F4C5]">
                        Sample
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[#101828] group-hover:text-[#D92D50] transition-colors">
                    {t.name}
                  </h3>
                  <p className="text-xs text-[#667085] line-clamp-2 mt-1">
                    {t.description || 'Single-page responsive template.'}
                  </p>

                  {/* Niche Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-3">
                    {(t.nicheTags || []).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-white border border-[#E4E7EC] text-[10px] font-medium text-[#475467]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-3 bg-white flex items-center justify-between border-t border-[#F2F4F7]">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(t)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#101828] hover:bg-[#F2F4F7] cursor-pointer"
                  >
                    <Eye size={13} className="text-[#D92D50]" />
                    <span>Preview</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(t)}
                      title="Duplicate template"
                      className="p-1.5 rounded-lg text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7] cursor-pointer"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      title="Edit HTML & details"
                      className="p-1.5 rounded-lg text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7] cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchive(t)}
                      title="Archive template"
                      className="p-1.5 rounded-lg text-[#667085] hover:text-[#D92D50] hover:bg-[#FEECEB] cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PREVIEW MODAL (Sandboxed Iframe) */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-[24px] w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="px-6 py-3.5 border-b border-[#ECEEF2] flex items-center justify-between flex-wrap gap-3 bg-[#FAFBFD]">
              <div>
                <h3 className="text-sm font-bold text-[#101828]">
                  Template Preview: {previewTemplate.name}
                </h3>
                <span className="text-[11px] text-[#667085]">
                  Rendered in isolated sandbox with sample clinic data
                </span>
              </div>

              {/* Device Toggle */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-black/10">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    previewDevice === 'desktop' ? 'bg-[#101828] text-white' : 'text-[#667085] hover:text-[#101828]'
                  }`}
                  title="Desktop (100%)"
                >
                  <Monitor size={14} />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    previewDevice === 'tablet' ? 'bg-[#101828] text-white' : 'text-[#667085] hover:text-[#101828]'
                  }`}
                  title="Tablet (768px)"
                >
                  <Tablet size={14} />
                  <span className="hidden sm:inline">Tablet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    previewDevice === 'mobile' ? 'bg-[#101828] text-white' : 'text-[#667085] hover:text-[#101828]'
                  }`}
                  title="Mobile (375px)"
                >
                  <Smartphone size={14} />
                  <span className="hidden sm:inline">Mobile</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="w-8 h-8 rounded-full hover:bg-[#F2F4F7] text-[#667085] flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Iframe Viewport Container */}
            <div className="flex-1 bg-[#EEF0F4] overflow-auto p-4 flex items-center justify-center">
              <div
                className="h-full bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-300 border border-black/10"
                style={{
                  width:
                    previewDevice === 'desktop'
                      ? '100%'
                      : previewDevice === 'tablet'
                      ? '768px'
                      : '375px',
                  maxWidth: '100%',
                }}
              >
                <iframe
                  title="Template Preview"
                  sandbox=""
                  srcDoc={renderWebsiteTemplate(
                    previewTemplate.html,
                    DUMMY_DETAILS,
                    DUMMY_BRAND,
                    { withRibbon: true }
                  )}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT TEMPLATE MODAL */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-[24px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#ECEEF2] flex items-center justify-between bg-[#FAFBFD]">
              <div>
                <h3 className="text-base font-bold text-[#101828]">
                  {editingTemplate ? `Edit Template: ${editingTemplate.name}` : 'New Website Template'}
                </h3>
                <span className="text-xs text-[#667085]">
                  Max 300 KB single-file HTML with inline CSS. Security validation runs on save.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F2F4F7] text-[#667085] flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {editorErrors.length > 0 && (
                <div className="p-3.5 bg-[#FEECEB] border border-[#FECDCA] rounded-xl text-xs text-[#D92D50] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    <span>Please correct the following:</span>
                  </div>
                  {editorErrors.map((err, idx) => (
                    <div key={idx}>&bull; {err}</div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Template Name <span className="text-[#D92D50]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Modern Dental Studio"
                    className="w-full px-3 py-2 rounded-xl border border-black/10 text-xs text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Niche / Category Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="e.g. Dental, Modern, Minimal, One-page"
                    className="w-full px-3 py-2 rounded-xl border border-black/10 text-xs text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="One-sentence description of the visual style and target practice type"
                  className="w-full px-3 py-2 rounded-xl border border-black/10 text-xs text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#FAFBFD] rounded-xl border border-black/10 text-xs text-[#667085] space-y-1">
                <div className="font-semibold text-[#101828]">HTML Source:</div>
                <p className="text-[11px]">
                  Template HTML source code is immutable and cannot be edited in-app. Templates are synced from verified public GitHub repositories in Website Studio &gt; Templates.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-[#ECEEF2] flex items-center justify-between bg-[#FAFBFD]">
              <span className="text-[11px] text-[#667085]">
                Validates tags, inline scripts, iframe restrictions, and size limit before saving.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#667085] hover:text-[#101828] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white rounded-full transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Validating & Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
