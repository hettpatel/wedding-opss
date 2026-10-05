import { describe, expect, it } from 'vitest';
import { invitationFileName, sanitizeFileNamePart } from './filename';

describe('file name sanitisation', () => {
  it('builds the expected invitation file name', () => {
    expect(invitationFileName('Ramesh Patel')).toBe('Wedding_Invitation_Ramesh_Patel.pdf');
    expect(invitationFileName('Mr. & Mrs. Ramesh Patel')).toBe(
      'Wedding_Invitation_Mr_Mrs_Ramesh_Patel.pdf'
    );
  });

  it('removes characters that break file systems', () => {
    expect(sanitizeFileNamePart('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
  });

  it('falls back when nothing usable is left', () => {
    expect(sanitizeFileNamePart('***')).toBe('Guest');
    expect(sanitizeFileNamePart('')).toBe('Guest');
  });

  it('avoids reserved Windows names', () => {
    expect(sanitizeFileNamePart('CON')).toBe('CON_file');
  });
});
