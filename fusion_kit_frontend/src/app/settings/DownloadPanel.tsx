import { Dialog, Transition } from "@headlessui/react";
import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import React, {
  Fragment, useCallback, useId, useState,
} from "react";
import { unreachable } from "../../utils";
import { ErrorBox } from "../ErrorBox";
import { ProgressBar } from "../ProgressBar";
import { DownloadState, useDownloadModel } from "./hooks";

interface DownloadableModel {
  name: string,
  id: string,
}

const MODELS: DownloadableModel[] = [
  {
    name: "Stable Diffusion v1.4",
    id: "01GE3DCJF6388V175BF3A08R3W",
  },
];

interface DownloadPanelProps {
  open: boolean,
  onClose: () => void,
}

export const DownloadPanel: React.FC<DownloadPanelProps> = (props) => {
  const {
    open, onClose,
  } = props;

  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 h-80 w-screen max-w-md max-h-screen">
                <div
                  className={clsx(
                    "px-4 pt-5 pb-4 sm:p-6 transition-all absolute inset-0",
                  )}
                >
                  <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                    Select a model to download
                  </Dialog.Title>
                  <DownloadSelector onSelect={(id) => setSelectedModel(id)} />
                </div>
                <div
                  className={clsx(
                    "px-4 pt-5 pb-4 sm:p-6 transition-all duration-300 absolute bg-white w-full inset-y-0",
                    selectedModel != null ? "left-0" : "left-full",
                  )}
                >
                  <DownloadScreen
                    modelId={selectedModel}
                    onBack={() => setSelectedModel(null)}
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

interface DownloadSelectorProps {
  onSelect: (_id: string) => void,
}

const DownloadSelector: React.FC<DownloadSelectorProps> = (props) => {
  return (
    <ul className="divide-y divide-gray-200">
      {MODELS.map((model) => (
        <li key={model.id} className="flex py-4 items-center justify-between">
          <p className="text-sm text-gray-900">{model.name}</p>
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white py-1 px-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={() => props.onSelect(model.id)}
          >
            Download
          </button>
        </li>
      ))}
    </ul>
  );
};

interface DownloadScreenProps {
  modelId: string | null,
  onBack: () => void,
}

const DownloadScreen: React.FC<DownloadScreenProps> = (props) => {
  const { modelId, onBack } = props;

  const [agreed, setAgreed] = useState(false);
  const agreeId = useId();

  const { downloadModel, downloadState, canDownload } = useDownloadModel();

  const onDownloadComplete = useCallback(() => {
    onBack();
  }, [onBack]);
  const onDownloadModel = useCallback(() => {
    if (modelId != null && canDownload) {
      downloadModel({ modelId, onDownloadComplete });
    }
  }, [canDownload, modelId, downloadModel, onDownloadComplete]);

  return (
    <div className="h-full space-y-2 overflow-auto p-2">
      <button type="button" onClick={onBack}>
        <span aria-hidden="true">&larr; </span>
        Back
      </button>
      <h3 className="font-bold">Model license</h3>
      <div>
        <h4 className="mb-1">Use restrictions</h4>
        <p className="text-sm font-bold">You agree not to use the Model or Derivatives of the Model:</p>
        <ul className="text-sm list-disc list-inside">
          {/* eslint-disable-next-line max-len */}
          <li>In any way that violates any applicable national, federal, state, local or international law or regulation;</li>
          {/* eslint-disable-next-line max-len */}
          <li>For the purpose of exploiting, harming or attempting to exploit or harm minors in any way;</li>
          {/* eslint-disable-next-line max-len */}
          <li>To generate or disseminate verifiably false information and/or content with the purpose of harming others;</li>
          {/* eslint-disable-next-line max-len */}
          <li>To generate or disseminate personal identifiable information that can be used to harm an individual;</li>
          <li>To defame, disparage or otherwise harass others;</li>
          {/* eslint-disable-next-line max-len */}
          <li>For fully automated decision making that adversely impacts an individual’s legal rights or otherwise creates or modifies a binding, enforceable obligation;</li>
          {/* eslint-disable-next-line max-len */}
          <li>For any use intended to or which has the effect of discriminating against or harming individuals or groups based on online or offline social behavior or known or predicted personal or personality characteristics;</li>
          {/* eslint-disable-next-line max-len */}
          <li>To exploit any of the vulnerabilities of a specific group of persons based on their age, social, physical or mental characteristics, in order to materially distort the behavior of a person pertaining to that group in a manner that causes or is likely to cause that person or another person physical or psychological harm;</li>
          {/* eslint-disable-next-line max-len */}
          <li>For any use intended to or which has the effect of discriminating against individuals or groups based on legally protected characteristics or categories; - To provide medical advice and medical results interpretation;</li>
          {/* eslint-disable-next-line max-len */}
          <li>To generate or disseminate information for the purpose to be used for administration of justice, law enforcement, immigration or asylum processes, such as predicting an individual will commit fraud/crime commitment (e.g. by text profiling, drawing causal relationships between assertions made in documents, indiscriminate and arbitrarily-targeted use).</li>
        </ul>
      </div>
      <div>
        <h4 className="mb-1">License terms</h4>
        <blockquote className="text-xs text-gray-600">
          Copyright (c) 2022 Robin Rombach and Patrick Esser and contributors
          <br />
          <br />
          CreativeML Open RAIL-M
          <br />
          dated August 22, 2022
          <br />
          <br />
          Section I: PREAMBLE
          <br />
          <br />
          Multimodal generative models are being widely adopted and used, and have the
          potential to transform the way artists, among other individuals, conceive and
          benefit from AI or ML technologies as a tool for content creation.
          <br />
          <br />
          Notwithstanding the current and potential benefits that these artifacts can
          bring to society at large, there are also concerns about potential misuses of
          them, either due to their technical limitations or ethical considerations.
          <br />
          <br />
          In short, this license strives for both the open and responsible downstream use
          of the accompanying model. When it comes to the open character, we took
          inspiration from open source permissive licenses regarding the grant of IP
          rights. Referring to the downstream responsible use, we added use-based
          restrictions not permitting the use of the Model in very specific scenarios, in
          order for the licensor to be able to enforce the license in case potential
          misuses of the Model may occur. At the same time, we strive to promote open and
          responsible research on generative models for art and content generation.
          <br />
          <br />
          Even though downstream derivative versions of the model could be released under
          different licensing terms, the latter will always have to include - at minimum -
          the same use-based restrictions as the ones in the original license (this
          license). We believe in the intersection between open and responsible AI
          development; thus, this License aims to strike a balance between both in order
          to enable responsible open-science in the field of AI.
          <br />
          <br />
          This License governs the use of the model (and its derivatives) and is informed
          by the model card associated with the model.
          <br />
          <br />
          NOW THEREFORE, You and Licensor agree as follows:
          <br />
          <br />
          1. Definitions
          <br />
          <br />
          - &quot;License&quot; means the terms and conditions for use, reproduction, and
          Distribution as defined in this document.
          <br />
          - &quot;Data&quot; means a collection of information and/or content extracted from the
          dataset used with the Model, including to train, pretrain, or otherwise evaluate
          the Model. The Data is not licensed under this License.
          <br />
          - &quot;Output&quot; means the results of operating a Model as embodied in informational
          content resulting therefrom.
          <br />
          - &quot;Model&quot; means any accompanying machine-learning based assemblies (including
          checkpoints), consisting of learnt weights, parameters (including optimizer
          states), corresponding to the model architecture as embodied in the
          Complementary Material, that have been trained or tuned, in whole or in part on
          the Data, using the Complementary Material.
          <br />
          - &quot;Derivatives of the Model&quot; means all modifications to the Model, works based
          on the Model, or any other model which is created or initialized by transfer of
          patterns of the weights, parameters, activations or output of the Model, to the
          other model, in order to cause the other model to perform similarly to the Model,
          including - but not limited to - distillation methods entailing the use of
          intermediate data representations or methods based on the generation of
          synthetic data by the Model for training the other model.
          <br />
          - &quot;Complementary Material&quot; means the accompanying source code and scripts used
          to define, run, load, benchmark or evaluate the Model, and used to prepare data
          for training or evaluation, if any. This includes any accompanying documentation,
          tutorials, examples, etc, if any.
          <br />
          - &quot;Distribution&quot; means any transmission, reproduction, publication or other
          sharing of the Model or Derivatives of the Model to a third party, including
          providing the Model as a hosted service made available by electronic or other
          remote means - e.g. API-based or web access.
          <br />
          - &quot;Licensor&quot; means the copyright owner or entity authorized by the copyright
          owner that is granting the License, including the persons or entities that may
          have rights in the Model and/or distributing the Model.
          <br />
          - &quot;You&quot; (or &quot;Your&quot;) means an individual or
          Legal Entity exercising permissions
          granted by this License and/or making use of the Model for whichever purpose and
          in any field of use, including usage of the Model in an end-use application -
          e.g. chatbot, translator, image generator.
          <br />
          - &quot;Third Parties&quot; means individuals or legal entities that are not under common
          control with Licensor or You.
          <br />
          - &quot;Contribution&quot; means any work of authorship, including the original version
          of the Model and any modifications or additions to that Model or Derivatives of
          the Model thereof, that is intentionally submitted to Licensor for inclusion in
          the Model by the copyright owner or by an individual or Legal Entity authorized
          to submit on behalf of the copyright owner. For the purposes of this definition,
          &quot;submitted&quot; means any form of electronic, verbal, or written communication sent
          to the Licensor or its representatives, including but not limited to
          communication on electronic mailing lists, source code control systems, and
          issue tracking systems that are managed by, or on behalf of, the Licensor for
          the purpose of discussing and improving the Model, but excluding communication
          that is conspicuously marked or otherwise designated in writing by the copyright
          owner as &quot;Not a Contribution.&quot;
          <br />
          - &quot;Contributor&quot; means Licensor and any individual or Legal Entity on behalf of
          whom a Contribution has been received by Licensor and subsequently incorporated
          within the Model.
          <br />
          <br />
          Section II: INTELLECTUAL PROPERTY RIGHTS
          <br />
          <br />
          Both copyright and patent grants apply to the Model, Derivatives of the Model
          and Complementary Material. The Model and Derivatives of the Model are subject
          to additional terms as described in Section III.
          <br />
          <br />
          2. Grant of Copyright License. Subject to the terms and conditions of this
          License, each Contributor hereby grants to You a perpetual, worldwide,
          non-exclusive, no-charge, royalty-free, irrevocable copyright license to
          reproduce, prepare, publicly display, publicly perform, sublicense, and
          distribute the Complementary Material, the Model, and Derivatives of the
          Model.
          <br />
          3. Grant of Patent License. Subject to the terms and conditions of this License
          and where and as applicable, each Contributor hereby grants to You a perpetual,
          worldwide, non-exclusive, no-charge, royalty-free, irrevocable (except as stated
          in this paragraph) patent license to make, have made, use, offer to sell, sell,
          import, and otherwise transfer the Model and the Complementary Material, where
          such license applies only to those patent claims licensable by such Contributor
          that are necessarily infringed by their Contribution(s) alone or by combination
          of their Contribution(s) with the Model to which such Contribution(s) was
          submitted. If You institute patent litigation against any entity (including a
          cross-claim or counterclaim in a lawsuit) alleging that the Model and/or
          Complementary Material or a Contribution incorporated within the Model and/or
          Complementary Material constitutes direct or contributory patent infringement,
          then any patent licenses granted to You under this License for the Model and/or
          Work shall terminate as of the date such litigation is asserted or filed.
          <br />
          <br />
          Section III: CONDITIONS OF USAGE, DISTRIBUTION AND REDISTRIBUTION
          <br />
          <br />
          4. Distribution and Redistribution. You may host for Third Party remote access
          purposes (e.g. software-as-a-service), reproduce and distribute copies of the
          Model or Derivatives of the Model thereof in any medium, with or without
          modifications, provided that You meet the following conditions:
          <br />
          Use-based restrictions as referenced in paragraph 5 MUST be included as an
          enforceable provision by You in any type of legal agreement (e.g. a license)
          governing the use and/or distribution of the Model or Derivatives of the Model,
          and You shall give notice to subsequent users You Distribute to, that the Model
          or Derivatives of the Model are subject to paragraph 5. This provision does not
          apply to the use of Complementary Material.
          <br />
          You must give any Third Party recipients of the Model or Derivatives of the
          Model a copy of this License;
          <br />
          You must cause any modified files to carry prominent notices stating that You
          changed the files;
          <br />
          You must retain all copyright, patent, trademark, and attribution notices
          excluding those notices that do not pertain to any part of the Model,
          Derivatives of the Model.
          <br />
          You may add Your own copyright statement to Your modifications and may provide
          additional or different license terms and conditions - respecting paragraph
          4.a. - for use, reproduction, or Distribution of Your modifications, or for
          any such Derivatives of the Model as a whole, provided Your use, reproduction,
          and Distribution of the Model otherwise complies with the conditions stated in
          this License.
          <br />
          5. Use-based restrictions. The restrictions set forth in Attachment A are
          considered Use-based restrictions. Therefore You cannot use the Model and the
          Derivatives of the Model for the specified restricted uses. You may use the
          Model subject to this License, including only for lawful purposes and in
          accordance with the License. Use may include creating any content with,
          finetuning, updating, running, training, evaluating and/or reparametrizing the
          Model. You shall require all of Your users who use the Model or a Derivative of
          the Model to comply with the terms of this paragraph (paragraph 5).
          <br />
          6. The Output You Generate. Except as set forth herein, Licensor claims no
          rights in the Output You generate using the Model. You are accountable for
          the Output you generate and its subsequent uses. No use of the output can
          contravene any provision as stated in the License.
          <br />
          <br />
          Section IV: OTHER PROVISIONS
          <br />
          <br />
          7. Updates and Runtime Restrictions. To the maximum extent permitted by law,
          Licensor reserves the right to restrict (remotely or otherwise) usage of the
          Model in violation of this License, update the Model through electronic means,
          or modify the Output of the Model based on updates. You shall undertake
          reasonable efforts to use the latest version of the Model.
          <br />
          8. Trademarks and related. Nothing in this License permits You to make use of
          Licensors’ trademarks, trade names, logos or to otherwise suggest endorsement
          or misrepresent the relationship between the parties; and any rights not
          expressly granted herein are reserved by the Licensors.
          <br />
          9. Disclaimer of Warranty. Unless required by applicable law or agreed to in
          writing, Licensor provides the Model and the Complementary Material (and each
          Contributor provides its Contributions) on an &quot;AS IS&quot; BASIS, WITHOUT WARRANTIES
          OR CONDITIONS OF ANY KIND, either express or implied, including, without
          limitation, any warranties or conditions of TITLE, NON-INFRINGEMENT,
          MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE. You are solely responsible
          for determining the appropriateness of using or redistributing the Model,
          Derivatives of the Model, and the Complementary Material and assume any risks
          associated with Your exercise of permissions under this License.
          <br />
          10. Limitation of Liability. In no event and under no legal theory, whether in
          tort (including negligence), contract, or otherwise, unless required by
          applicable law (such as deliberate and grossly negligent acts) or agreed to in
          writing, shall any Contributor be liable to You for damages, including any
          direct, indirect, special, incidental, or consequential damages of any character
          arising as a result of this License or out of the use or inability to use the
          Model and the Complementary Material (including but not limited to damages for
          loss of goodwill, work stoppage, computer failure or malfunction, or any and all
          other commercial damages or losses), even if such Contributor has been advised
          of the possibility of such damages.
          <br />
          11. Accepting Warranty or Additional Liability. While redistributing the Model,
          Derivatives of the Model and the Complementary Material thereof, You may choose
          to offer, and charge a fee for, acceptance of support, warranty, indemnity, or
          other liability obligations and/or rights consistent with this License. However,
          in accepting such obligations, You may act only on Your own behalf and on Your
          sole responsibility, not on behalf of any other Contributor, and only if You
          agree to indemnify, defend, and hold each Contributor harmless for any liability
          incurred by, or claims asserted against, such Contributor by reason of your
          accepting any such warranty or additional liability.
          <br />
          12. If any provision of this License is held to be invalid, illegal or
          unenforceable, the remaining provisions shall be unaffected thereby and remain
          valid as if such provision had not been set forth herein.
          <br />
          <br />
          END OF TERMS AND CONDITIONS
          <br />
          <br />
          <br />
          <br />
          <br />
          Attachment A
          <br />
          <br />
          Use Restrictions
          <br />
          <br />
          You agree not to use the Model or Derivatives of the Model:
          <br />
          - In any way that violates any applicable national, federal, state, local or
          international law or regulation;
          <br />
          - For the purpose of exploiting, harming or attempting to exploit or harm minors
          in any way;
          <br />
          - To generate or disseminate verifiably false information and/or content with
          the purpose of harming others;
          <br />
          - To generate or disseminate personal identifiable information that can be used
          to harm an individual;
          <br />
          - To defame, disparage or otherwise harass others;
          <br />
          - For fully automated decision making that adversely impacts an individual’s
          legal rights or otherwise creates or modifies a binding, enforceable
          obligation;
          <br />
          - For any use intended to or which has the effect of discriminating against or
          harming individuals or groups based on online or offline social behavior or
          known or predicted personal or personality characteristics;
          <br />
          - To exploit any of the vulnerabilities of a specific group of persons based on
          their age, social, physical or mental characteristics, in order to materially
          distort the behavior of a person pertaining to that group in a manner that
          causes or is likely to cause that person or another person physical or
          psychological harm;
          <br />
          - For any use intended to or which has the effect of discriminating against
          individuals or groups based on legally protected characteristics or
          categories;
          <br />
          - To provide medical advice and medical results interpretation;
          <br />
          - To generate or disseminate information for the purpose to be used for
          administration of justice, law enforcement, immigration or asylum processes,
          such as predicting an individual will commit fraud/crime commitment (e.g. by
          text profiling, drawing causal relationships between assertions made in
          documents, indiscriminate and arbitrarily-targeted use).
          <br />
        </blockquote>
        <div className="flex items-center space-x-2 my-4">
          <input
            type="checkbox"
            id={agreeId}
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <label htmlFor={agreeId} className="text-sm text-gray-900">I agree to the license terms</label>
        </div>

        <DownloadStatus downloadState={downloadState} />

        <button
          type="button"
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mt-4 mr-2 disabled:cursor-not-allowed disabled:bg-indigo-200"
          onClick={onDownloadModel}
          disabled={!agreed || !canDownload}
        >
          <ArrowDownTrayIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
          Download now
        </button>
      </div>
    </div>
  );
};

interface DownloadStatusProps {
  downloadState: DownloadState,
}

const DownloadStatus: React.FC<DownloadStatusProps> = (props) => {
  const { downloadState } = props;

  switch (downloadState.state) {
    case "complete":
      return null;
    case "waiting":
      return null;
    case "error":
      return (
        <ErrorBox className="my-4">
          <h3 className="text-sm font-medium text-red-800">Error downloading model</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              {downloadState.message}
            </p>
          </div>
        </ErrorBox>
      );
    case "downloading": {
      const progressKnown = downloadState.totalBytes != null && downloadState.totalBytes > 0;
      const progress = downloadState.downloadedBytes / Math.max(downloadState.totalBytes ?? 1, 1);

      return (
        <div className="h-8 rounded-md overflow-hidden shadow">
          <ProgressBar
            status={progressKnown ? "loading" : "indeterminate"}
            progress={progressKnown ? progress : 1}
            label="Downloading"
          />
        </div>
      );
    }
    default:
      return unreachable(downloadState);
  }
};
