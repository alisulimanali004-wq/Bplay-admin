import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button, FileUpload, Select, type UploadedFile } from '@ui';
import { step5Schema, type Step5Values } from '../../api/facility.schema';
import { uploadFacilityMedia } from '../../api';
import {
  FACILITY_DOC_TYPES,
  toFacilityDocType,
  type CreateFacilityInput,
  type FacilityDocType,
} from '../../api/facility.types';
import styles from './wizard.module.css';

const MAX_IMAGES = 6;

export interface Step5MediaProps {
  draft: Partial<CreateFacilityInput>;
  isSubmitting: boolean;
  submitLabel: string;
  onBack: (patch: Partial<CreateFacilityInput>) => void;
  onNext: (patch: Partial<CreateFacilityInput>) => void;
}

/** Wizard final step — upload photos (max 6, reorderable) + verification documents. */
export function Step5Media({ draft, isSubmitting, submitLabel, onBack, onNext }: Step5MediaProps) {
  const { t } = useTranslation();

  const {
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitted },
  } = useForm<Step5Values>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      images: draft.images ?? [],
      documents: draft.documents ?? [],
    },
  });

  const images = watch('images');
  const documents = watch('documents') ?? [];

  const imageFiles: UploadedFile[] = images.map((url, index) => ({
    url,
    name: `${t('facility.wizard.media.photo')} ${index + 1}`,
  }));

  /**
   * The uploader is keyed by URL, not by name.
   *
   * `documents[].name` is the API's doc-TYPE enum, so it cannot double as the
   * label shown in the file list — and the old code did exactly that: it wrote
   * the uploaded filename into `name` and sent it as the type, which is not a
   * member of the enum and made every create request fail validation.
   *
   * So the two are kept apart: the row below carries the type in a Select, and
   * the uploader only ever reports URLs back to us.
   */
  const documentFiles: UploadedFile[] = documents.map((doc) => ({
    url: doc.url,
    name: t(`owner.doc.type.${doc.name}`, { defaultValue: doc.name }),
  }));

  const docTypeOptions = FACILITY_DOC_TYPES.map((type) => ({
    value: type,
    label: t(`owner.doc.type.${type}`, { defaultValue: type }),
  }));

  const onImagesChange = (files: UploadedFile[]) =>
    setValue(
      'images',
      files.map((file) => file.url),
      { shouldValidate: isSubmitted, shouldDirty: true },
    );

  /**
   * Newly added files default to `other` — a valid enum member — so a document
   * is never left holding a value the API would reject. The admin refines it
   * with the per-document Select; existing rows keep the type already chosen.
   */
  const onDocumentsChange = (files: UploadedFile[]) => {
    const byUrl = new Map(documents.map((doc) => [doc.url, doc.name]));
    setValue(
      'documents',
      files.map((file) => ({ name: toFacilityDocType(byUrl.get(file.url)), url: file.url })),
      { shouldValidate: isSubmitted, shouldDirty: true },
    );
  };

  const onDocumentTypeChange = (url: string, type: FacilityDocType) =>
    setValue(
      'documents',
      documents.map((doc) => (doc.url === url ? { ...doc, name: type } : doc)),
      { shouldValidate: isSubmitted, shouldDirty: true },
    );

  const toPatch = (values: Step5Values): Partial<CreateFacilityInput> => ({
    images: values.images,
    documents: values.documents,
  });

  const submit = handleSubmit((values) => onNext(toPatch(values)));

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.group} role="group" aria-label={t('facility.wizard.media.images')}>
        <span className={styles.groupLabel}>{t('facility.wizard.media.images')}</span>
        <p className={styles.hint}>{t('facility.wizard.media.imagesHint')}</p>
        <FileUpload
          variant="image"
          value={imageFiles}
          onChange={onImagesChange}
          maxFiles={MAX_IMAGES}
          accept="image/*"
          dropLabel={t('facility.wizard.media.drop')}
          browseLabel={t('facility.wizard.media.browse')}
          hint={t('facility.wizard.media.imageTypes')}
          removeLabel={t('facility.wizard.media.remove')}
          coverLabel={t('facility.wizard.media.cover')}
          moveEarlierLabel={t('facility.wizard.media.moveEarlier')}
          moveLaterLabel={t('facility.wizard.media.moveLater')}
          maxReachedLabel={t('facility.wizard.media.imagesMax')}
          uploadFile={uploadFacilityMedia}
          uploadingLabel={t('facility.wizard.media.uploading')}
          uploadErrorLabel={t('facility.wizard.media.uploadError')}
          testId="wizard-images"
        />
        {errors.images?.message && (
          <p className={styles.error} role="alert">
            {t(errors.images.message)}
          </p>
        )}
      </div>

      <div className={styles.group} role="group" aria-label={t('facility.wizard.media.documents')}>
        <span className={styles.groupLabel}>{t('facility.wizard.media.documents')}</span>
        <p className={styles.hint}>{t('facility.wizard.media.documentsHint')}</p>
        <FileUpload
          variant="document"
          value={documentFiles}
          onChange={onDocumentsChange}
          accept=".pdf,image/*"
          dropLabel={t('facility.wizard.media.docDrop')}
          browseLabel={t('facility.wizard.media.browse')}
          hint={t('facility.wizard.media.docTypes')}
          removeLabel={t('facility.wizard.media.remove')}
          uploadFile={uploadFacilityMedia}
          uploadingLabel={t('facility.wizard.media.uploading')}
          uploadErrorLabel={t('facility.wizard.media.uploadError')}
          testId="wizard-docs"
        />
        {documents.length > 0 && (
          <ul className={styles.docTypeList} data-testid="wizard-doc-types">
            {documents.map((doc) => (
              <li key={doc.url} className={styles.docTypeRow}>
                <span className={styles.docTypeName} title={doc.url}>
                  {t(`owner.doc.type.${doc.name}`, { defaultValue: doc.name })}
                </span>
                <Select
                  value={doc.name}
                  onChange={(value) => onDocumentTypeChange(doc.url, value as FacilityDocType)}
                  options={docTypeOptions}
                  aria-label={t('facility.wizard.media.docType')}
                />
              </li>
            ))}
          </ul>
        )}
        {errors.documents?.message && (
          <p className={styles.error} role="alert">
            {t(errors.documents.message)}
          </p>
        )}
      </div>

      <footer className={styles.footer}>
        <Button
          variant="ghost"
          className={styles.footerBack}
          onClick={() => onBack(toPatch(getValues()))}
          data-testid="wizard-back"
        >
          {t('facility.wizard.back')}
        </Button>
        <Button type="submit" isLoading={isSubmitting} data-testid="wizard-create">
          {submitLabel}
        </Button>
      </footer>
    </form>
  );
}
