import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, FileUpload, Select, type UploadedFile } from '@ui';
import { useUpdateFacility } from '../hooks/useUpdateFacility';
import {
  FACILITY_DOC_TYPES,
  facilityToInput,
  toFacilityDocType,
  uploadFacilityMedia,
  type Facility,
  type FacilityDocType,
} from '../api';
import styles from './FacilityMediaManager.module.css';

interface Props {
  facility: Facility;
}

/**
 * Add and remove a facility's photos and verification documents from the
 * profile, without walking the whole edit wizard.
 *
 * Both lists are edited LOCALLY and committed with an explicit Save. The update
 * endpoint replaces each collection wholesale, so an autosave-per-file would
 * fire a full replace on every click — slower, and far easier to leave in a
 * half-applied state if one request fails.
 *
 * The payload carries ONLY the collection that changed. Everything else the
 * facility owns (courts, hours, sports, location) is left out entirely so the
 * backend leaves it untouched.
 */
export function FacilityMediaManager({ facility }: Props) {
  const { t } = useTranslation();
  const updateMutation = useUpdateFacility();

  const [images, setImages] = useState<string[]>(facility.images);
  const [documents, setDocuments] = useState(
    facility.documents.map((doc) => ({
      name: toFacilityDocType(doc.name),
      url: doc.url,
    })),
  );

  const imagesDirty = JSON.stringify(images) !== JSON.stringify(facility.images);
  const documentsDirty =
    JSON.stringify(documents) !==
    JSON.stringify(
      facility.documents.map((doc) => ({ name: toFacilityDocType(doc.name), url: doc.url })),
    );
  const dirty = imagesDirty || documentsDirty;

  const imageFiles: UploadedFile[] = images.map((url, index) => ({
    url,
    name: `${t('facility.wizard.media.photo')} ${index + 1}`,
  }));
  const documentFiles: UploadedFile[] = documents.map((doc) => ({
    url: doc.url,
    name: t(`owner.doc.type.${doc.name}`, { defaultValue: doc.name }),
  }));

  const docTypeOptions = FACILITY_DOC_TYPES.map((type) => ({
    value: type,
    label: t(`owner.doc.type.${type}`, { defaultValue: type }),
  }));

  const onDocumentsChange = (files: UploadedFile[]) => {
    const byUrl = new Map(documents.map((doc) => [doc.url, doc.name]));
    setDocuments(
      files.map((file) => ({ name: toFacilityDocType(byUrl.get(file.url)), url: file.url })),
    );
  };

  const save = () => {
    // `facilityToInput` supplies the shape the endpoint expects; the two media
    // arrays are overridden with what was edited here.
    const input = facilityToInput(facility);
    updateMutation.mutate({
      id: facility.id,
      input: { ...input, images, documents },
    });
  };

  const reset = () => {
    setImages(facility.images);
    setDocuments(
      facility.documents.map((doc) => ({ name: toFacilityDocType(doc.name), url: doc.url })),
    );
  };

  return (
    <Card className={styles.card} data-testid="facility-media-manager">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('facility.profile.manageMedia')}</h2>
        {dirty && (
          <div className={styles.actions}>
            <Button variant="ghost" onClick={reset} disabled={updateMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={save}
              isLoading={updateMutation.isPending}
              data-testid="facility-media-save"
            >
              {t('common.save')}
            </Button>
          </div>
        )}
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>{t('facility.wizard.media.images')}</span>
        <FileUpload
          variant="image"
          value={imageFiles}
          onChange={(files) => setImages(files.map((file) => file.url))}
          maxFiles={6}
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
          testId="facility-media-images"
        />
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>{t('facility.wizard.media.documents')}</span>
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
          testId="facility-media-docs"
        />
        {documents.length > 0 && (
          <ul className={styles.docTypeList}>
            {documents.map((doc) => (
              <li key={doc.url} className={styles.docTypeRow}>
                <span className={styles.docTypeName} title={doc.url}>
                  {t(`owner.doc.type.${doc.name}`, { defaultValue: doc.name })}
                </span>
                <Select
                  value={doc.name}
                  onChange={(value) =>
                    setDocuments((prev) =>
                      prev.map((entry) =>
                        entry.url === doc.url
                          ? { ...entry, name: value as FacilityDocType }
                          : entry,
                      ),
                    )
                  }
                  options={docTypeOptions}
                  aria-label={t('facility.wizard.media.docType')}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
