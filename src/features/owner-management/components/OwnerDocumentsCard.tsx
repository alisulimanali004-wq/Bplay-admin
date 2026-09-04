import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ReasonDialog,
  DocumentViewerModal,
  Modal,
  Field,
  Select,
  PlusIcon,
  InboxIcon,
  ImageIcon,
  DocumentIcon,
  EyeIcon,
  CheckIcon,
  XIcon,
  RotateCcwIcon,
} from '@ui';
import { ownerDocBadgeVariant, type OwnerDocument, type OwnerDocType } from '../api/owner.types';
import { useOwnerDocumentReview } from '../hooks/useOwnerDocumentReview';
import { useUploadOwnerDocument } from '../hooks/useUploadOwnerDocument';
import styles from './OwnerDocumentsCard.module.css';

interface Props {
  ownerId: string;
  documents: OwnerDocument[];
}

/** Mirrors the `document_type` enum the upload endpoint accepts. */
const DOC_TYPE_OPTIONS: OwnerDocType[] = [
  'national_id',
  'business_license',
  'tax_certificate',
  'ownership_proof',
  'other',
];

/**
 * Matches the server's ALLOWED_DOC_MIME. Kept in sync deliberately: the picker
 * filtering to types the server would reject just moves the failure later.
 */
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';

/** The server's multipart limit. Checked here so a too-large file fails fast. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** The owner's KYC documents — view each (image/PDF) and accept/reject with a reason. */
export function OwnerDocumentsCard({ ownerId, documents }: Props) {
  const { t } = useTranslation();
  const review = useOwnerDocumentReview();
  const [viewing, setViewing] = useState<OwnerDocument | null>(null);
  const [rejecting, setRejecting] = useState<OwnerDocument | null>(null);
  const [accepting, setAccepting] = useState<OwnerDocument | null>(null);

  const upload = useUploadOwnerDocument();
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<OwnerDocType>('national_id');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();

  const closeUpload = () => {
    setUploading(false);
    setFile(null);
    setFileError(undefined);
    setDocType('national_id');
  };

  const submitUpload = () => {
    if (!file) return;
    // Checked before the request so an oversized file reports a clear message
    // rather than the server's generic multipart failure.
    if (file.size > MAX_FILE_BYTES) {
      setFileError(t('owner.doc.fileTooLarge'));
      return;
    }
    upload.mutate({ id: ownerId, docType, file }, { onSuccess: closeUpload });
  };

  const accept = (document: OwnerDocument) =>
    review.mutate({ id: ownerId, documentId: document.id, action: 'accept' });

  const confirmReject = (reason: string) => {
    if (!rejecting) return;
    review.mutate(
      { id: ownerId, documentId: rejecting.id, action: 'reject', reason },
      { onSuccess: () => setRejecting(null) },
    );
  };

  const confirmAccept = () => {
    if (!accepting) return;
    review.mutate(
      { id: ownerId, documentId: accepting.id, action: 'accept' },
      { onSuccess: () => setAccepting(null) },
    );
  };

  // An already-decided document is reversed behind a quiet "change decision"
  // control instead of a loud opposite-action button: accepted → reject (with a
  // reason), rejected → accept (confirmed). Only `under_review` shows the pair.
  const changeDecision = (document: OwnerDocument) =>
    document.status === 'accepted' ? setRejecting(document) : setAccepting(document);

  return (
    <Card className={styles.card} data-testid="owner-detail-documents">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('owner.profile.documents')}</h2>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<PlusIcon />}
          onClick={() => setUploading(true)}
          data-testid="owner-doc-add"
        >
          {t('owner.doc.add')}
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={<InboxIcon />}
          title={t('owner.profile.noDocuments')}
          description={t('owner.profile.noDocumentsHint')}
        />
      ) : (
        <ul className={styles.docs}>
          {documents.map((document) => (
            <li key={document.id} className={styles.doc}>
              <span className={styles.docIcon} aria-hidden>
                {document.kind === 'image' ? <ImageIcon /> : <DocumentIcon />}
              </span>
              <span className={styles.docMeta}>
                <span className={styles.docHead}>
                  <span className={styles.docName}>{t(`owner.doc.type.${document.type}`)}</span>
                  <Badge variant={ownerDocBadgeVariant(document.status)} size="sm">
                    {t(`owner.doc.status.${document.status}`)}
                  </Badge>
                </span>
                {document.status === 'rejected' && document.rejectionReason && (
                  <span className={styles.docReason}>“{document.rejectionReason}”</span>
                )}
              </span>
              <span className={styles.docActions}>
                {document.url && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<EyeIcon />}
                    onClick={() => setViewing(document)}
                    data-testid={`owner-doc-view-${document.id}`}
                  >
                    {t('owner.doc.view')}
                  </Button>
                )}
                {document.status === 'under_review' ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<CheckIcon />}
                      onClick={() => accept(document)}
                      disabled={review.isPending}
                      data-testid={`owner-doc-accept-${document.id}`}
                    >
                      {t('owner.doc.accept')}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<XIcon />}
                      onClick={() => setRejecting(document)}
                      data-testid={`owner-doc-reject-${document.id}`}
                    >
                      {t('owner.doc.reject')}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<RotateCcwIcon />}
                    onClick={() => changeDecision(document)}
                    disabled={review.isPending}
                    data-testid={`owner-doc-change-${document.id}`}
                  >
                    {t('owner.doc.change')}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <DocumentViewerModal
        isOpen={viewing !== null}
        onClose={() => setViewing(null)}
        url={viewing?.url}
        kind={viewing?.kind ?? 'pdf'}
        title={viewing ? t(`owner.doc.type.${viewing.type}`) : undefined}
        closeLabel={t('common.close')}
        openLabel={t('owner.doc.openTab')}
        emptyLabel={t('owner.doc.noPreview')}
        fallbackNote={t('owner.doc.pdfHint')}
        errorLabel={t('common.docLoadError')}
      />

      <ReasonDialog
        isOpen={rejecting !== null}
        onClose={() => setRejecting(null)}
        onConfirm={confirmReject}
        title={t('owner.doc.rejectTitle')}
        description={
          rejecting
            ? t('owner.doc.rejectMessage', { type: t(`owner.doc.type.${rejecting.type}`) })
            : undefined
        }
        reasonLabel={t('owner.confirm.reasonLabel')}
        reasonPlaceholder={t('owner.confirm.reasonPlaceholder')}
        confirmText={t('owner.doc.reject')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={review.isPending}
      />

      <ConfirmDialog
        isOpen={accepting !== null}
        onClose={() => setAccepting(null)}
        onConfirm={confirmAccept}
        title={t('owner.doc.acceptTitle')}
        message={
          accepting
            ? t('owner.doc.acceptMessage', { type: t(`owner.doc.type.${accepting.type}`) })
            : undefined
        }
        confirmText={t('owner.doc.accept')}
        cancelText={t('common.cancel')}
        variant="primary"
        isLoading={review.isPending}
      />

      <Modal
        isOpen={uploading}
        onClose={closeUpload}
        title={t('owner.doc.addTitle')}
        size="sm"
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="secondary" onClick={closeUpload}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={submitUpload}
              isLoading={upload.isPending}
              disabled={!file}
              data-testid="owner-doc-upload-submit"
            >
              {t('owner.doc.upload')}
            </Button>
          </>
        }
      >
        <div className={styles.uploadForm}>
          <Field label={t('owner.doc.typeLabel')} htmlFor="doc-type">
            <Select
              id="doc-type"
              value={docType}
              onChange={(value) => setDocType(value as OwnerDocType)}
              options={DOC_TYPE_OPTIONS.map((value) => ({
                value,
                label: t(`owner.doc.type.${value}`),
              }))}
              aria-label={t('owner.doc.typeLabel')}
            />
          </Field>

          <Field label={t('owner.doc.fileLabel')} htmlFor="doc-file" error={fileError}>
            <input
              id="doc-file"
              type="file"
              className={styles.fileInput}
              accept={ACCEPTED_TYPES}
              onChange={(event) => {
                setFileError(undefined);
                setFile(event.target.files?.[0] ?? null);
              }}
              data-testid="owner-doc-file"
            />
          </Field>

          <p className={styles.uploadHint}>{t('owner.doc.uploadHint')}</p>
        </div>
      </Modal>
    </Card>
  );
}
